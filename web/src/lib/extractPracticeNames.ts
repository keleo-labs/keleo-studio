/**
 * Extract all element names from a practice document for use in dropdown menus.
 * Combines names from current document, baseline, and dependencies.
 */

export type PracticeNameLists = {
  practiceNames: string[];
  baselineNames: string[];
  alphaNames: string[];
  stateNamesByAlpha: Map<string, string[]>;
  activitySpaceNames: string[];
  activityNamesBySpace: Map<string, string[]>;
  competencyNames: string[];
  competencyLevelNamesByCompetency: Map<string, string[]>;
  workProductNames: string[];
  levelOfDetailNamesByWorkProduct: Map<string, string[]>;
  narrativeTypeNames: string[];
  narrativeElementNamesByType: Map<string, string[]>;
  patternNames: string[];
  personaNames: string[];
  personaGroupNames: string[];
  alphaInstanceNames: string[];
  workProductInstanceNames: string[];
};

export function extractPracticeNames(
  currentDoc: Record<string, unknown>,
  baseline: Record<string, unknown> | null,
  dependencies: Record<string, unknown>[],
  allLibraryBodies: unknown[] = []
): PracticeNameLists {
  const practiceNames = new Set<string>();
  const baselineNames = new Set<string>();
  const alphaNames = new Set<string>();
  const stateNamesByAlpha = new Map<string, Set<string>>();
  const activitySpaceNames = new Set<string>();
  const activityNamesBySpace = new Map<string, Set<string>>();
  const competencyNames = new Set<string>();
  const competencyLevelNamesByCompetency = new Map<string, Set<string>>();
  const workProductNames = new Set<string>();
  const levelOfDetailNamesByWorkProduct = new Map<string, Set<string>>();
  const narrativeTypeNames = new Set<string>();
  const narrativeElementNamesByType = new Map<string, Set<string>>();
  const patternNames = new Set<string>();
  const personaNames = new Set<string>();
  const personaGroupNames = new Set<string>();
  const alphaInstanceNames = new Set<string>();
  const workProductInstanceNames = new Set<string>();

  // Extract practice names and baseline names from all library documents
  allLibraryBodies.forEach((doc: any) => {
    if (doc?.name && typeof doc.name === 'string') {
      // Check if it's a baseline (has focuses array, which baselines have)
      if (Array.isArray(doc.focuses) && doc.focuses.length > 0) {
        baselineNames.add(doc.name);
      }
      // All documents with names are potential practice dependencies
      practiceNames.add(doc.name);
    }
  });

  // Process all practices (baseline, dependencies, current)
  const allPractices = [
    ...(baseline ? [baseline] : []),
    ...dependencies,
    currentDoc,
  ];

  allPractices.forEach(practice => {
    // Extract alpha names and states
    if (Array.isArray(practice.alphas)) {
      practice.alphas.forEach((alpha: any) => {
        const alphaName = alpha?.name;
        if (alphaName && typeof alphaName === 'string') {
          alphaNames.add(alphaName);

          // Extract state names for this alpha
          if (Array.isArray(alpha.states)) {
            if (!stateNamesByAlpha.has(alphaName)) {
              stateNamesByAlpha.set(alphaName, new Set());
            }
            alpha.states.forEach((state: any) => {
              const stateName = state?.name;
              if (stateName && typeof stateName === 'string') {
                stateNamesByAlpha.get(alphaName)!.add(stateName);
              }
            });
          }
        }
      });
    }

    // Extract activity space names and activities
    if (Array.isArray(practice.activitySpaces)) {
      practice.activitySpaces.forEach((space: any) => {
        const spaceName = space?.name;
        if (spaceName && typeof spaceName === 'string') {
          activitySpaceNames.add(spaceName);

          // Extract activity names for this space
          if (Array.isArray(space.activities)) {
            if (!activityNamesBySpace.has(spaceName)) {
              activityNamesBySpace.set(spaceName, new Set());
            }
            space.activities.forEach((activity: any) => {
              const activityName = activity?.name;
              if (activityName && typeof activityName === 'string') {
                activityNamesBySpace.get(spaceName)!.add(activityName);
              }
            });
          }
        }
      });
    }

    // Extract competency names and levels
    if (Array.isArray(practice.competencies)) {
      practice.competencies.forEach((comp: any) => {
        const compName = comp?.name;
        if (compName && typeof compName === 'string') {
          competencyNames.add(compName);

          // Extract competency level names
          if (Array.isArray(comp.levels)) {
            if (!competencyLevelNamesByCompetency.has(compName)) {
              competencyLevelNamesByCompetency.set(compName, new Set());
            }
            comp.levels.forEach((level: any) => {
              const levelName = level?.name;
              if (levelName && typeof levelName === 'string') {
                competencyLevelNamesByCompetency.get(compName)!.add(levelName);
              }
            });
          }
        }
      });
    }

    // Extract work product names and levels of detail
    if (Array.isArray(practice.workProducts)) {
      practice.workProducts.forEach((wp: any) => {
        const wpName = wp?.name;
        if (wpName && typeof wpName === 'string') {
          workProductNames.add(wpName);

          // Extract level of detail names
          if (Array.isArray(wp.levelsOfDetail)) {
            if (!levelOfDetailNamesByWorkProduct.has(wpName)) {
              levelOfDetailNamesByWorkProduct.set(wpName, new Set());
            }
            wp.levelsOfDetail.forEach((lod: any) => {
              const lodName = lod?.name;
              if (lodName && typeof lodName === 'string') {
                levelOfDetailNamesByWorkProduct.get(wpName)!.add(lodName);
              }
            });
          }
        }
      });
    }

    // Extract narrative type names and elements
    if (Array.isArray(practice.narrativeTypes)) {
      practice.narrativeTypes.forEach((nt: any) => {
        const ntName = nt?.name;
        if (ntName && typeof ntName === 'string') {
          narrativeTypeNames.add(ntName);

          // Extract narrative element names
          if (Array.isArray(nt.narrativeElements)) {
            if (!narrativeElementNamesByType.has(ntName)) {
              narrativeElementNamesByType.set(ntName, new Set());
            }
            nt.narrativeElements.forEach((elem: any) => {
              const elemName = elem?.name;
              if (elemName && typeof elemName === 'string') {
                narrativeElementNamesByType.get(ntName)!.add(elemName);
              }
            });
          }
        }
      });
    }

    // Extract pattern names
    if (Array.isArray(practice.patterns)) {
      practice.patterns.forEach((pattern: any) => {
        const patternName = pattern?.name;
        if (patternName && typeof patternName === 'string') {
          patternNames.add(patternName);
        }
      });
    }

    // Extract persona names
    if (Array.isArray(practice.personas)) {
      practice.personas.forEach((persona: any) => {
        const personaName = persona?.name;
        if (personaName && typeof personaName === 'string') {
          personaNames.add(personaName);
        }
      });
    }

    // Extract persona group names
    if (Array.isArray(practice.personaGroups)) {
      practice.personaGroups.forEach((group: any) => {
        const groupName = group?.name;
        if (groupName && typeof groupName === 'string') {
          personaGroupNames.add(groupName);
        }
      });
    }

    // Extract alpha instance names
    if (Array.isArray(practice.alphaInstances)) {
      practice.alphaInstances.forEach((instance: any) => {
        const instanceName = instance?.name;
        if (instanceName && typeof instanceName === 'string') {
          alphaInstanceNames.add(instanceName);
        }
      });
    }

    // Extract work product instance names
    if (Array.isArray(practice.workProductInstances)) {
      practice.workProductInstances.forEach((instance: any) => {
        const instanceName = instance?.name;
        if (instanceName && typeof instanceName === 'string') {
          workProductInstanceNames.add(instanceName);
        }
      });
    }
  });

  // Convert Sets to sorted arrays
  const result = {
    practiceNames: Array.from(practiceNames).sort(),
    baselineNames: Array.from(baselineNames).sort(),
    alphaNames: Array.from(alphaNames).sort(),
    stateNamesByAlpha: new Map(
      Array.from(stateNamesByAlpha.entries()).map(([alpha, states]) => [
        alpha,
        Array.from(states).sort(),
      ])
    ),
    activitySpaceNames: Array.from(activitySpaceNames).sort(),
    activityNamesBySpace: new Map(
      Array.from(activityNamesBySpace.entries()).map(([space, activities]) => [
        space,
        Array.from(activities).sort(),
      ])
    ),
    competencyNames: Array.from(competencyNames).sort(),
    competencyLevelNamesByCompetency: new Map(
      Array.from(competencyLevelNamesByCompetency.entries()).map(([comp, levels]) => [
        comp,
        Array.from(levels).sort(),
      ])
    ),
    workProductNames: Array.from(workProductNames).sort(),
    levelOfDetailNamesByWorkProduct: new Map(
      Array.from(levelOfDetailNamesByWorkProduct.entries()).map(([wp, lods]) => [
        wp,
        Array.from(lods).sort(),
      ])
    ),
    narrativeTypeNames: Array.from(narrativeTypeNames).sort(),
    narrativeElementNamesByType: new Map(
      Array.from(narrativeElementNamesByType.entries()).map(([type, elements]) => [
        type,
        Array.from(elements).sort(),
      ])
    ),
    patternNames: Array.from(patternNames).sort(),
    personaNames: Array.from(personaNames).sort(),
    personaGroupNames: Array.from(personaGroupNames).sort(),
    alphaInstanceNames: Array.from(alphaInstanceNames).sort(),
    workProductInstanceNames: Array.from(workProductInstanceNames).sort(),
  };

  return result;
}
