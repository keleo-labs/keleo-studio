# Helper Functions
def sort_by_sequence(items_array):
    # Sorts an array of objects by their 'seq' or 'level' property silently
    return sorted(items_array, key=lambda x: x.get('seq', x.get('level', 0)))

def render_narratives(narratives_array):
    # Narratives provide the structured storytelling framework [cite: 26]
    if not narratives_array: return
    for narrative in narratives_array:
        print(f"### {narrative.narrativeName}")
        print(f"**Format:** {narrative.narrativeTypeName}")
        print(f"{narrative.description}\n")
        
        for context in sort_by_sequence(narrative.narrativeContexts):
            # Renders authored narrative slices based on the user's progress [cite: 100]
            print(f"**{context.narrativeElementName}:** {context.context}")
        print("---")

def render_checklists(checklist_array):
    # Checklists act as dynamic state-gating mechanisms [cite: 37]
    if not checklist_array: return
    for item in sort_by_sequence(checklist_array):
        method_tag = f" *(Verification: {item.verificationMethod})*" if item.verificationMethod else ""
        # Outputs bullet points directly from JSON, hiding 'seq'
        print(f"* **{item.name}**{method_tag}: {item.description}")