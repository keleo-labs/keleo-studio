def render_execution_and_roles(practices_array):
    print("## Execution & Roles")
    for practice in practices_array:
        
        # Render Personas and Groups
        print("### Organizational Roles")
        for group in practice.personaGroups:
            print(f"#### Team: {group.name}")
            print(group.description)
            render_narratives(group.narratives)
            print("**Comprised of:** " + ", ".join(group.personaNames))
            
        for persona in practice.personas:
            print(f"#### Role: {persona.name}")
            print(persona.description)
            if persona.competencies:
                print("**Required Competency Levels:**")
                for comp in persona.competencies:
                    print(f"- {comp.competencyName}: {comp.competencyLevelName}")
                    
        # Render Activities
        print("### Operational Workflows (Activities)")
        for activity in practice.activities:
            print(f"#### Activity: {activity.name}")
            print(activity.description)
            print(f"**Governing Space:** {activity.activitySpaceName}")
            render_narratives(activity.narratives)
            
            if activity.involves:
                print(f"**Involves:** {', '.join(activity.involves)}")
            if activity.worksOn:
                print("**Works On Artifacts:**")
                for target in activity.worksOn:
                    print(f"- {target.workProductName} (Target Level: {target.levelOfDetailName})")
            if activity.contributesTo:
                print("**Contributes To Outcomes:**")
                for outcome in activity.contributesTo:
                    print(f"- {outcome.alphaName} (Target State: {outcome.stateName})")