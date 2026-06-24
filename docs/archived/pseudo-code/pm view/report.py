# --- UTILITY FUNCTIONS ---
def sort_by_sequence(items):
    # Silently sorts an array of objects by 'seq' or 'level' (ascending)
    return sorted(items, key=lambda x: x.get('seq', x.get('level', 0)))

def render_narratives(narratives_array):
    # Extracts the structured storytelling elements to provide context
    if not narratives_array: return
    for narrative in narratives_array:
        print(f"### {narrative.narrativeName} ({narrative.narrativeTypeName})")
        print(f"{narrative.description}")
        
        for context in sort_by_sequence(narrative.narrativeContexts):
            # Outputs the context slice but hides the 'seq' property
            print(f"**{context.narrativeElementName}:** {context.context}")
        print("\n")

def render_checklists(checklist_array):
    # Extracts the strict validation criteria for Definitions of Done
    if not checklist_array: return
    for item in sort_by_sequence(checklist_array):
        # Hides 'seq', outputs name, description, and optional verification method
        verification = f" [Verify via: {item.verificationMethod}]" if item.verificationMethod else ""
        print(f"  * {item.name}: {item.description}{verification}")


# --- REPORT RENDERERS ---

def render_strategic_context(method_json):
    print(f"# Project Initiation: {method_json.name}")
    print(f"**Method Objective:** {method_json.description}\n")
    
    print("## 1. Strategic Context & Business Case")
    render_narratives(method_json.narratives)

def render_project_lifecycle(practices_array):
    print("## 2. Project Lifecycle & Phasing")
    for practice in practices_array:
        for pattern in practice.patterns:
            print(f"### Lifecycle Model: {pattern.name}")
            print(f"{pattern.description}\n")
            
            for view in sort_by_sequence(pattern.patternViews):
                print(f"#### Phase: {view.name}")
                print(f"{view.description}")
                render_narratives(view.narratives)
                
                if view.alphaStates:
                    print("**Target Milestones for this Phase:**")
                    for state_ref in view.alphaStates:
                        print(f"  - Advance '{state_ref.alphaName}' to State: [{state_ref.stateName}]")
                print("\n")

def render_milestones_and_deliverables(practices_array):
    print("## 3. Milestones & Deliverables Backlog")
    for practice in practices_array:
        
        print("### Tracked Milestones (Alphas)")
        for alpha in practice.alphas:
            print(f"#### Milestone Track: {alpha.name} (Focus: {alpha.focusName})")
            print(alpha.description)
            
            for state in sort_by_sequence(alpha.states):
                print(f"  **State Target: {state.name}**")
                print(f"  {state.description}")
                print("  *Acceptance Criteria (Definition of Done):*")
                render_checklists(state.checklist)
            print("\n")

        print("### Required Deliverables (Work Products)")
        for wp in practice.workProducts:
            print(f"#### Artifact: {wp.name}")
            print(wp.description)
            
            for lod in sort_by_sequence(wp.levelsOfDetail):
                print(f"  **Required Detail Level: {lod.name}**")
                print(f"  {lod.description}")
                print("  *Validation Checklist:*")
                render_checklists(lod.checklist)
            print("\n")

def render_resourcing_and_activities(practices_array):
    print("## 4. Resourcing & Activity Backlog")
    for practice in practices_array:
        
        print("### Required Project Teams (Persona Groups)")
        for group in practice.personaGroups:
            print(f"#### Team: {group.name}")
            print(group.description)
            print(f"**Roles Included:** {', '.join(group.personaNames)}\n")
            
        print("### Required Roles (Personas)")
        for persona in practice.personas:
            print(f"#### Role: {persona.name}")
            print(persona.description)
            if persona.competencies:
                print("**Required Competencies:**")
                for comp in persona.competencies:
                    print(f"  - {comp.competencyName}: {comp.competencyLevelName}")
            print("\n")
            
        print("### Operational Activities (Task Backlog)")
        for activity in practice.activities:
            print(f"#### Task: {activity.name} (Space: {activity.activitySpaceName})")
            print(activity.description)
            
            if activity.involves:
                print(f"**Assigned To:** {', '.join(activity.involves)}")
            
            if activity.worksOn:
                print("**Produces/Updates:**")
                for target in activity.worksOn:
                    print(f"  - {target.workProductName} (Target Level: {target.levelOfDetailName})")
                    
            if activity.contributesTo:
                print("**Advances Milestone:**")
                for outcome in activity.contributesTo:
                    print(f"  - {outcome.alphaName} -> [{outcome.stateName}]")
            print("\n")


# --- MAIN EXECUTION ---
def generate_project_planning_report(method_json):
    render_strategic_context(method_json)
    
    # Check if practices are embedded directly or referenced
    practices = method_json.get('practices', [])
    
    if practices:
        render_project_lifecycle(practices)
        render_milestones_and_deliverables(practices)
        render_resourcing_and_activities(practices)