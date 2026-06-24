#!/bin/bash
# Script to update import paths after Phase 3 reorganization

echo "Updating import paths..."

# Update lib imports to use new structure
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/citationUtils"|from "@/lib/display/citations"|g' \
  -e 's|from "@/lib/assetUtils"|from "@/lib/display/assets"|g' \
  -e 's|from "@/lib/practiceElementAliasDisplay"|from "@/lib/display/elementDisplay"|g' \
  -e 's|from "@/lib/practiceElementTags"|from "@/lib/display/elementDisplay"|g' \
  -e 's|from "@/lib/elementSourceTracking"|from "@/lib/display/sourceTracking"|g' \
  -e 's|from "@/lib/theme"|from "@/lib/display/theme"|g' \
  -e 's|from "@/lib/languagePack"|from "@/lib/display/languagePack"|g' \
  -e 's|from "@/lib/fontLoader"|from "@/lib/display/fontLoader"|g' \
  -e 's|from "@/lib/renderIconInSvg"|from "@/lib/display/renderIconInSvg"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/validate"|from "@/lib/core/validate"|g' \
  -e 's|from "@/lib/errorFormatting"|from "@/lib/core/errorFormatting"|g' \
  -e 's|from "@/lib/json-path-utils"|from "@/lib/core/json-path-utils"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/languagePackTypes"|from "@/lib/data/languagePackTypes"|g' \
  -e 's|from "@/lib/languagePacksData"|from "@/lib/data/languagePacksData"|g' \
  -e 's|from "@/lib/themeTokens"|from "@/lib/data/themeTokens"|g' \
  -e 's|from "@/lib/navigationConfig"|from "@/lib/data/navigationConfig"|g' \
  -e 's|from "@/lib/dashboardConfig"|from "@/lib/data/dashboardConfig"|g' \
  -e 's|from "@/lib/practiceFormDefaults"|from "@/lib/data/practiceFormDefaults"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/methodFocus"|from "@/lib/analysis/methodFocus"|g' \
  -e 's|from "@/lib/extractPracticeNames"|from "@/lib/analysis/extractPracticeNames"|g' \
  -e 's|from "@/lib/schemaRelax"|from "@/lib/analysis/schemaRelax"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/pdfHtml"|from "@/lib/rendering/pdfHtml"|g' \
  -e 's|from "@/lib/pdfBrowseHtml"|from "@/lib/rendering/pdfBrowseHtml"|g' \
  -e 's|from "@/lib/pdfSvgs"|from "@/lib/rendering/pdfSvgs"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/yaml-json-converter"|from "@/lib/converters/yaml-json-converter"|g' \
  -e 's|from "@/lib/patternView"|from "@/lib/converters/patternView"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/lib/topologyData"|from "@/lib/diagrams/topology/data"|g' \
  -e 's|from "@/lib/progressiveFlowData"|from "@/lib/diagrams/progressiveFlow/data"|g' \
  -e 's|from "@/lib/sankeyFlowData"|from "@/lib/diagrams/sankey/data"|g' \
  -e 's|from "@/lib/kanbanPatternData"|from "@/lib/diagrams/kanban/data"|g' \
  -e 's|from "@/lib/patternMatrixDiagram"|from "@/lib/diagrams/patternMatrix/diagram"|g' \
  -e 's|from "@/lib/alphaContributesDiagram"|from "@/lib/diagrams/alphaContributes/diagram"|g' \
  -e 's|from "@/lib/radarChartData"|from "@/lib/diagrams/radarChart/data"|g' \
  -e 's|from "@/lib/radarChartGeometry"|from "@/lib/diagrams/radarChart/geometry"|g' \
  {} \;

# Update component imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/AppShell"|from "@/components/layout/AppShell"|g' \
  -e 's|from "@/components/AppNav"|from "@/components/layout/AppNav"|g' \
  -e 's|from "@/components/AliasedName"|from "@/components/common/AliasedName"|g' \
  -e 's|from "@/components/IconAsset"|from "@/components/common/IconAsset"|g' \
  -e 's|from "@/components/LibraryDocumentCard"|from "@/components/common/LibraryDocumentCard"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/BrowseView"|from "@/components/browse/BrowseView"|g' \
  -e 's|from "@/components/PracticeAuthorForm"|from "@/components/practice/PracticeAuthorForm"|g' \
  -e 's|from "@/components/FullPracticeView"|from "@/components/practice/FullPracticeView"|g' \
  -e 's|from "@/components/PracticeReportView"|from "@/components/practice/PracticeReportView"|g' \
  -e 's|from "@/components/PracticeHumanReadablePanel"|from "@/components/practice/PracticeHumanReadablePanel"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/TopologyDiagram"|from "@/components/visualizations/diagrams/TopologyDiagram"|g' \
  -e 's|from "@/components/ProgressiveFlowDiagram"|from "@/components/visualizations/diagrams/ProgressiveFlowDiagram"|g' \
  -e 's|from "@/components/SankeyFlowDiagram"|from "@/components/visualizations/diagrams/SankeyFlowDiagram"|g' \
  -e 's|from "@/components/PracticeRadarChart"|from "@/components/visualizations/charts/PracticeRadarChart"|g' \
  -e 's|from "@/components/KanbanPatternBoard"|from "@/components/visualizations/patterns/KanbanPatternBoard"|g' \
  -e 's|from "@/components/KanbanPatternBoardPF"|from "@/components/visualizations/patterns/KanbanPatternBoardPatternFly"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/ProjectManagementView"|from "@/components/project/ProjectManagementView"|g' \
  -e 's|from "@/components/DashboardSectionCarousel"|from "@/components/dashboard/DashboardSectionCarousel"|g' \
  -e 's|from "@/components/DashboardSectionEditor"|from "@/components/dashboard/DashboardSectionEditor"|g' \
  {} \;

# Update editor field imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/editors/fields/TextField"|from "@/components/editors/fields/base/TextField"|g' \
  -e 's|from "@/components/editors/fields/TextAreaField"|from "@/components/editors/fields/base/TextAreaField"|g' \
  -e 's|from "@/components/editors/fields/SelectField"|from "@/components/editors/fields/base/SelectField"|g' \
  -e 's|from "@/components/editors/fields/InlineTextField"|from "@/components/editors/fields/base/InlineTextField"|g' \
  -e 's|from "@/components/editors/fields/InlineTextArea"|from "@/components/editors/fields/base/InlineTextArea"|g' \
  -e 's|from "@/components/editors/fields/InlineSelectField"|from "@/components/editors/fields/base/InlineSelectField"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/editors/fields/PropertyTable"|from "@/components/editors/fields/containers/PropertyTable"|g' \
  -e 's|from "@/components/editors/fields/PropertyRow"|from "@/components/editors/fields/containers/PropertyRow"|g' \
  -e 's|from "@/components/editors/fields/Section"|from "@/components/editors/fields/containers/Section"|g' \
  -e 's|from "@/components/editors/fields/ArrayField"|from "@/components/editors/fields/containers/ArrayField"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/editors/fields/ReadonlyField"|from "@/components/editors/fields/readonly/ReadonlyField"|g' \
  -e 's|from "@/components/editors/fields/InlineReadonlyValue"|from "@/components/editors/fields/readonly/InlineReadonlyValue"|g' \
  {} \;

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e 's|from "@/components/editors/fields/TagsField"|from "@/components/editors/fields/domain/TagsField"|g' \
  -e 's|from "@/components/editors/fields/CitationsField"|from "@/components/editors/fields/domain/CitationsField"|g' \
  -e 's|from "@/components/editors/fields/AlphaInstancesField"|from "@/components/editors/fields/domain/AlphaInstancesField"|g' \
  -e 's|from "@/components/editors/fields/AlphaContributionsField"|from "@/components/editors/fields/domain/AlphaContributionsField"|g' \
  -e 's|from "@/components/editors/fields/WorkProductContributionsField"|from "@/components/editors/fields/domain/WorkProductContributionsField"|g' \
  -e 's|from "@/components/editors/fields/CompetencyLevelReferencesField"|from "@/components/editors/fields/domain/CompetencyLevelReferencesField"|g' \
  -e 's|from "@/components/editors/fields/PracticeDependenciesField"|from "@/components/editors/fields/domain/PracticeDependenciesField"|g' \
  -e 's|from "@/components/editors/fields/NarrativesField"|from "@/components/editors/fields/domain/NarrativesField"|g' \
  -e 's|from "@/components/editors/fields/NarrativeContextsField"|from "@/components/editors/fields/domain/NarrativeContextsField"|g' \
  -e 's|from "@/components/editors/fields/MethodNarrativesField"|from "@/components/editors/fields/domain/MethodNarrativesField"|g' \
  -e 's|from "@/components/editors/fields/MethodTagsField"|from "@/components/editors/fields/domain/MethodTagsField"|g' \
  -e 's|from "@/components/editors/fields/StringArrayField"|from "@/components/editors/fields/domain/StringArrayField"|g' \
  {} \;

echo "Import path updates complete!"
