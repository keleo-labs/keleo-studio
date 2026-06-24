def render_executive_context(method_json):
    print(f"# {method_json.name}")
    print(f"*{method_json.description}*\n")
    
    if method_json.baselinePracticeName:
        print(f"**Baseline Practice:** {method_json.baselinePracticeName}\n")
    
    print("## Strategic Context")
    render_narratives(method_json.narratives)