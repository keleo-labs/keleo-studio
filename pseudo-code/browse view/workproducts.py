def render_work_products(practices_array):
    print("## Evidentiary Artifacts (Work Products)")
    for practice in practices_array:
        for wp in practice.workProducts:
            print(f"### Artifact: {wp.name}")
            print(wp.description)
            render_narratives(wp.narratives)
            
            print("#### Levels of Detail")
            for lod in sort_by_sequence(wp.levelsOfDetail):
                print(f"##### Level: {lod.name}")
                print(lod.description)
                
                if lod.contributesTo:
                    print("**Advances Concept:**")
                    for contribution in lod.contributesTo:
                        print(f"- {contribution.alphaName} (Target State: {contribution.stateName})")
                        
                print("**Validation Checklist:**")
                render_checklists(lod.checklist)