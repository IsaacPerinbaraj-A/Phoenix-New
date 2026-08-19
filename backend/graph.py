r"""LangGraph pipeline: five named nodes with conditional ingestion routing.

Topology:

    START -> ingest --(image usable)--> vision -> history -> reason -> safety -> END
                    \--(image unusable)---------^

The ingestion routing is a genuine graph-level conditional edge; the vision
node is visibly skipped when the quality gate rejects the image. Safety is
the final decision node on every normal path.
"""

from langgraph.graph import END, StateGraph

from agents.history import history_agent
from agents.ingestion import ingestion_agent, route_after_ingest
from agents.reasoning import reasoning_agent
from agents.safety import safety_verifier
from agents.vision import vision_agent
from schemas import CaseState


# Each node returns only the fields it owns, so LangGraph merges cleanly
# and each streamed update is a compact, provenance-labelled payload.

def _ingest_node(state: CaseState) -> dict:
    out = ingestion_agent(state)
    return {"image_ok": out.image_ok, "quality_note": out.quality_note}


def _vision_node(state: CaseState) -> dict:
    out = vision_agent(state)
    return {"vision": out.vision}


def _history_node(state: CaseState) -> dict:
    out = history_agent(state)
    return {"history": out.history}


def _reason_node(state: CaseState) -> dict:
    out = reasoning_agent(state)
    return {"reasoning": out.reasoning}


def _safety_node(state: CaseState) -> dict:
    out = safety_verifier(state)
    return {
        "final_band": out.final_band,
        "safety_triggers": out.safety_triggers,
        "safety_explanations": out.safety_explanations,
        "instruction": out.instruction,
        "disclaimer": out.disclaimer,
    }


def build_graph():
    """Compile the five-node DermaTriage graph."""
    g = StateGraph(CaseState)
    g.add_node("ingest", _ingest_node)
    g.add_node("vision", _vision_node)
    g.add_node("history", _history_node)
    g.add_node("reason", _reason_node)
    g.add_node("safety", _safety_node)

    g.set_entry_point("ingest")
    g.add_conditional_edges(
        "ingest",
        route_after_ingest,
        {
            "vision": "vision",
            "history": "history",
        },
    )
    g.add_edge("vision", "history")
    g.add_edge("history", "reason")
    g.add_edge("reason", "safety")
    g.add_edge("safety", END)
    return g.compile()


graph = build_graph()


def export_mermaid() -> str:
    """Mermaid topology export for documentation/demo (best effort)."""
    try:
        return graph.get_graph().draw_mermaid()
    except Exception:
        return "Mermaid export unavailable in this LangGraph version."


if __name__ == "__main__":
    print(export_mermaid())
