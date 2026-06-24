# Container Platform Onboarding Practice - Research Report

## Executive Summary

This report analyzes a comprehensive methodology for onboarding application teams onto a container-based platform. The methodology addresses the Technology Perspective through detailed architecture and implementation guidance (maturity level 3), the People Perspective through role definitions and team structures (maturity level 2), and the Process Perspective through defined workflows and value realization patterns (maturity level 3). The source content provides applied, behavioral guidance with worked examples and scenarios, representing a mature practice ready for organizational adoption.

The Container Platform Onboarding Practice extends the Platform Adoption Essentials baseline by specializing core concepts for the specific context of containerized workload migration and deployment. It provides detailed guidance for transitioning applications from traditional infrastructure to container platforms like Kubernetes, including technical patterns, team responsibilities, and progressive workflows that reduce risk and accelerate time-to-value.

This methodology is best represented as a single, cohesive practice rather than multiple practices. While it spans multiple concerns—technical migration, team enablement, and operational readiness—these elements are tightly coupled in the onboarding journey. Every team moving to containers follows the same fundamental progression: assessment, containerization, deployment, and operational handoff. Breaking this into separate practices would fragment what is inherently a unified experience.

The practice is distinguished by its progressive approach, starting with assessment and preparation, moving through containerization and platform integration, and culminating in production operations. It emphasizes self-service capabilities, golden path adoption, and team autonomy while maintaining appropriate governance and quality gates.

## Methodology Overview

### Scope and Structure

This is a single practice that guides application teams through the complete journey of onboarding containerized workloads onto a modern platform. The practice addresses a specific use-case: migrating existing applications or deploying new applications as containers on a shared platform infrastructure.

The practice extends Platform Adoption Essentials by providing specialized guidance for container adoption while depending on foundational platform capabilities being in place. It assumes the platform team has established core infrastructure, self-service interfaces, and golden paths. The onboarding practice then guides application teams through leveraging these capabilities.

### Dependencies

This practice assumes the Platform Adoption Essentials baseline is understood and that foundational platform capabilities exist. Specifically, it assumes:

- Platform infrastructure is operational and ready to host workloads
- Self-service interfaces and documentation are available
- Security guardrails and policies are established
- Platform team support mechanisms are in place

The practice does not address building the platform itself; rather, it focuses on the consumer-side journey of adopting an existing platform.

## Practice: Container Platform Onboarding

### Practice Overview

The Container Platform Onboarding Practice provides comprehensive guidance for application teams transitioning to container-based platforms. This practice specializes the Platform Adoption Essentials baseline by focusing specifically on the workload onboarding lifecycle, from initial assessment through production operations.

The practice covers technical transformation—containerizing applications, integrating with platform services, and establishing deployment automation—as well as organizational enablement—building team capabilities, defining responsibilities, and establishing operational practices. It applies primarily to the Solution focus (platform integration and application architecture) and Endeavor focus (team readiness and ways of working).

This practice is designed for platform consumers: application teams, product teams, and service owners who need to deploy and operate containerized workloads on a shared platform. It provides both prescriptive guidance (golden paths, templates, standards) and adaptive guidance (assessment frameworks, decision trees, troubleshooting patterns) to support teams with varying levels of container experience.

The methodology uses different terminology in some areas. What the platform team calls the "Container Runtime Configuration" is referred to in baseline terms as Platform configuration. Similarly, "Application Manifest" maps to the Requirements concept, and "Deployment Pipeline" corresponds to the System concept from the baseline.

### Context and Background

**The Container Revolution and Its Challenges**

Over the past decade, containerization has fundamentally transformed how organizations build, deploy, and operate software. What began as Docker's elegant solution to the "works on my machine" problem has evolved into sophisticated orchestration platforms like Kubernetes that manage thousands of containers across global infrastructure. This transformation promises unprecedented agility, resource efficiency, and operational consistency.

However, the journey from traditional infrastructure to container platforms is fraught with complexity. Application teams accustomed to virtual machines, direct server access, and familiar deployment patterns suddenly face a steep learning curve. Containers introduce new concepts—images, registries, orchestrators, service meshes—while simultaneously removing familiar tools and workflows. Teams that once deployed by copying files to servers now must understand declarative manifests, immutable infrastructure, and distributed system patterns.

Organizations that rush into container adoption without structured enablement often experience frustration and failure. Teams struggle with basic questions: How do we structure our container images? Where do secrets go? How do we debug when we can't SSH into a server? These knowledge gaps lead to poorly designed containers, brittle deployments, and resistance to platform adoption.

The most successful container platform transformations share common characteristics. They provide clear golden paths—prescriptive patterns that guide teams toward production-ready implementations. They invest in enablement—documentation, training, and embedded support that builds team capability. They establish progressive workflows—starting with simple use cases and gradually introducing complexity. And they create fast feedback loops—automated validation that catches issues early and guides teams toward best practices.

**Industry Practice and Research Foundation**

The Container Platform Onboarding Practice draws from established industry patterns and research. Google's Borg paper revealed how containerized orchestration could manage massive scale, leading to Kubernetes becoming the industry standard. The CNCF's maturity model provides frameworks for assessing container adoption readiness. Platform engineering thought leaders like Team Topologies authors Matthew Skelton and Manuel Pais have defined patterns for platform-as-product thinking that emphasizes developer experience and self-service capabilities.

Research from DORA (DevOps Research and Assessment) demonstrates that elite-performing organizations excel at platform capabilities. Their metrics show that effective internal platforms correlate with deployment frequency, lead time, and reliability improvements. The key differentiator is not just having a platform, but having well-defined onboarding patterns that enable team autonomy while maintaining standards.

Platform teams that treat onboarding as a first-class product capability see dramatically higher adoption rates and satisfaction. Teams report 60-80% reduction in time-to-first-deployment when golden paths and templates are available. Structured enablement reduces platform team toil by 40% as application teams become self-sufficient. These improvements compound over time as organizational knowledge and confidence grow.

## Solution Focus: Container Platform Integration

### Alpha: Container Application

**Container Application** represents the containerized workload being onboarded to the platform. This alpha specializes the baseline System concept by focusing specifically on applications packaged as containers with all their runtime dependencies, configurations, and operational requirements. A Container Application encompasses not just the application code, but the container image design, resource requirements, health checks, and integration patterns needed for platform operations.

**Progressive States:**

1. **Assessed:** The application's container readiness and platform requirements are evaluated.

   Criteria for achieving this state:
   - Application architecture and dependencies are documented
   - Containerization feasibility assessment is completed
   - Platform resource requirements are estimated (CPU, memory, storage)
   - External dependencies and integration points are identified
   - Data persistence and stateful requirements are understood
   - Security and compliance requirements are cataloged

2. **Containerized:** The application is packaged as a container image following platform standards.

   Criteria for achieving this state:
   - Dockerfile or build configuration follows platform best practices
   - Container image is built and stored in the platform's container registry
   - Image size is optimized (base image selection, layer optimization)
   - Application runs successfully in local container environment
   - Health check and readiness probe endpoints are implemented
   - Configuration is externalized (twelve-factor app principles applied)
   - Secrets and sensitive data are identified for external management

3. **Integrated:** The application is connected to platform services and capabilities.

   Criteria for achieving this state:
   - Platform deployment manifest is created (Kubernetes YAML, Helm chart, etc.)
   - Service discovery and networking configuration is defined
   - Platform observability integration is implemented (logging, metrics, tracing)
   - Platform security controls are applied (pod security, network policies)
   - Platform storage solutions are configured for persistent data
   - Configuration management integration is established (ConfigMaps, Secrets)
   - Resource requests and limits are defined based on testing

4. **Deployed:** The application is running in a non-production platform environment.

   Criteria for achieving this state:
   - Application successfully deploys to development or staging environment
   - All health checks pass consistently
   - Service-to-service communication is functional
   - Observability dashboards show expected telemetry
   - Load testing confirms resource allocation is appropriate
   - Rollback procedures are tested and validated
   - Team can deploy updates through self-service mechanisms

5. **Operational:** The application is running in production with established operational practices.

   Criteria for achieving this state:
   - Application is deployed to production environment
   - Monitoring and alerting are configured and actively monitored
   - Incident response procedures are documented and team-validated
   - Scaling behaviors (manual or automatic) are configured and tested
   - Backup and disaster recovery procedures are in place
   - Performance meets or exceeds pre-container baseline
   - Team demonstrates operational ownership and autonomy

6. **Optimized:** The application leverages advanced platform capabilities for improved performance and resilience.

   Criteria for achieving this state:
   - Advanced platform features are adopted (service mesh, advanced scheduling, etc.)
   - Cost optimization measures are implemented and monitored
   - Chaos engineering or resilience testing is performed regularly
   - Platform best practices are continuously refined based on learnings
   - Team shares knowledge and patterns with broader organization
   - Deployment and operational metrics show continuous improvement

**Context and Rationale:**

The Container Application alpha reflects the reality that containerization is not a binary state but a maturity journey. Teams don't simply "containerize" an application—they progressively adopt container and platform patterns, gaining confidence and sophistication over time.

The state progression aligns with observed team behaviors. Teams typically start with assessment to understand what they're getting into. They then focus on basic containerization—getting the app to run in a container at all. Integration comes next as they grapple with platform-specific patterns. Deployment to non-production provides a safety net for learning. Production deployment marks a milestone but not the end—teams continue optimizing as they gain experience.

This progression reduces risk by encouraging incremental advancement. Teams aren't expected to master advanced platform features on day one. Instead, they build foundational capabilities, validate their approach, and progressively adopt more sophisticated patterns.

**Specific Instances:**

This practice tracks several specific instances of Container Application based on common patterns:

- **Stateless Web Application:** Typical web services or APIs without persistent state, representing the simplest onboarding scenario
- **Stateful Database Application:** Applications requiring persistent storage, representing more complex platform integration
- **Batch Processing Application:** Job-based workloads with different operational patterns than long-running services
- **Legacy Monolith Application:** Large, complex applications being containerized incrementally

### Work Product: Container Image

The Container Image is the packaged, immutable artifact that contains the application and all its dependencies. This work product is central to container adoption—it's the primary deliverable of containerization efforts and the fundamental unit of deployment on container platforms. A well-designed container image follows platform standards, optimizes for size and security, and enables reliable, repeatable deployments.

**Levels of Detail:**

The container image progresses through increasing levels of sophistication and production-readiness:

**Level 1 - Basic:** A functional container image that runs the application.

Characteristics and verification criteria:
- Dockerfile exists and successfully builds an image
- Image contains all runtime dependencies
- Application starts and responds to basic requests
- Image is tagged with a version identifier
- Image can be pushed to and pulled from a registry

This level provides evidence for:
- Container Application reaching Containerized state

**Level 2 - Optimized:** A production-ready container image following platform best practices.

Characteristics and verification criteria:
- Base image is from approved platform image catalog
- Image layers are optimized for size and build caching
- Unnecessary tools and dependencies are removed
- Image scan shows no critical or high-severity vulnerabilities
- Non-root user is configured for runtime security
- Health check and readiness endpoints are exposed
- Environment-specific configuration is externalized
- Image build is automated and reproducible

This level provides evidence for:
- Container Application reaching Integrated state
- Container Application reaching Deployed state

**Level 3 - Hardened:** A fully hardened, enterprise-grade container image.

Characteristics and verification criteria:
- Image follows all organizational security standards
- Minimal base image (distroless or scratch when appropriate)
- All dependencies have documented supply chain provenance
- Image signing and verification is implemented
- Runtime security policies are defined and tested
- Image metadata includes complete bill of materials
- Multi-architecture support if required
- Regular vulnerability scanning and patching process established

This level provides evidence for:
- Container Application reaching Operational state
- Container Application reaching Optimized state

**Usage and Context:**

The Container Image represents a fundamental shift in deployment thinking. Traditional deployments often involved configuration management tools modifying servers in place. Container images embody immutable infrastructure—the complete, unchanging artifact that gets promoted through environments.

Teams should invest in image optimization early. Large images slow down deployments, increase storage costs, and expand the attack surface. Following platform image standards ensures compatibility and supportability. Security scanning catches vulnerabilities before production. These practices, established early, become habits that benefit every subsequent deployment.

Platform teams often provide base images, templates, and build pipelines that encode best practices. Application teams should leverage these golden paths rather than building from scratch. This approach ensures consistency, inherits security improvements, and reduces the learning curve.

**Specific Instances:**

This practice identifies specific instances of Container Image that teams commonly create:

- **Application Service Image:** The primary container image containing the application service code
- **Sidecar Proxy Image:** Supporting container images for service mesh proxies, log forwarders, etc.
- **Database Migration Image:** Job-specific images for running schema migrations or data transformations

### Work Product: Platform Deployment Manifest

The Platform Deployment Manifest defines how the containerized application should be deployed and managed on the platform. In Kubernetes environments, this is typically YAML configurations including Deployments, Services, ConfigMaps, and other resources. For other platforms, it may be Helm charts, Docker Compose files, or platform-specific configuration. This manifest is the operational specification that translates container images into running, managed workloads.

**Levels of Detail:**

**Level 1 - Functional:** Basic deployment configuration that runs the application.

Characteristics and verification criteria:
- Deployment resource defines pod template with container image
- Resource requests specify minimum CPU and memory
- Service resource exposes application endpoints
- Basic configuration is provided via environment variables
- Manifest deploys successfully to platform

This level provides evidence for:
- Container Application reaching Integrated state

**Level 2 - Production-Ready:** Comprehensive deployment configuration with operational controls.

Characteristics and verification criteria:
- Resource requests and limits are defined based on testing
- Readiness and liveness probes are configured
- Multiple replicas configured for availability
- Configuration management uses ConfigMaps and Secrets appropriately
- Labels and annotations follow platform conventions
- Update strategy is defined (rolling update, blue-green, etc.)
- Service accounts and RBAC permissions are configured
- Network policies restrict communication appropriately

This level provides evidence for:
- Container Application reaching Deployed state
- Container Application reaching Operational state

**Level 3 - Advanced:** Sophisticated deployment configuration leveraging advanced platform features.

Characteristics and verification criteria:
- Horizontal Pod Autoscaling is configured based on appropriate metrics
- Pod Disruption Budgets protect availability during platform maintenance
- Advanced scheduling controls (affinity, topology spread) are applied
- Service mesh integration is configured if applicable
- Progressive delivery configuration (canary, blue-green) is implemented
- Platform observability integrations are comprehensive
- Chaos engineering configurations test resilience
- GitOps or declarative workflow manages manifest lifecycle

This level provides evidence for:
- Container Application reaching Optimized state

**Usage and Context:**

The Platform Deployment Manifest is where container concepts meet platform reality. Teams must translate their understanding of how the application should run into platform-specific declarations. This requires learning platform abstractions while maintaining application context.

Platform teams should provide templates and generators that encode best practices. A well-designed template might prompt for application name, image reference, and resource estimates, then generate a complete manifest with appropriate health checks, scaling configuration, and security policies. This golden path approach dramatically accelerates onboarding while ensuring consistency.

Teams should treat deployment manifests as code—version controlled, reviewed, tested, and evolved. Changes to manifests should flow through the same rigor as application code changes. Over time, these manifests become valuable documentation of operational requirements and platform integration patterns.

## Endeavor Focus: Team Enablement and Operations

### Alpha: Team Container Capability

**Team Container Capability** represents the team's knowledge, skills, and confidence in working with containers and the platform. This alpha specializes the baseline Team concept by focusing specifically on the capabilities needed for container platform adoption. It recognizes that successful onboarding depends not just on technical artifacts but on team learning and empowerment.

**Progressive States:**

1. **Aware:** The team understands container concepts and platform value proposition.

   Criteria for achieving this state:
   - Team members have completed platform orientation and training
   - Basic container concepts are understood (images, containers, orchestration)
   - Platform capabilities and self-service tools are familiar
   - Team understands how containers benefit their specific applications
   - Questions about platform adoption can be articulated

2. **Capable:** The team can containerize and deploy applications with guidance.

   Criteria for achieving this state:
   - Team members can build and test container images locally
   - Team can create basic deployment manifests
   - Team knows how to access platform documentation and support
   - Team can follow golden path templates and patterns
   - Team has successfully deployed to non-production environment

3. **Proficient:** The team operates containerized applications independently.

   Criteria for achieving this state:
   - Team troubleshoots common container and platform issues independently
   - Team makes configuration and deployment changes with confidence
   - Team monitors application health and responds to alerts appropriately
   - Team optimizes resource usage based on observability data
   - Team has operated production workloads for sustained period

4. **Expert:** The team masters advanced platform capabilities and shares knowledge.

   Criteria for achieving this state:
   - Team leverages advanced platform features effectively
   - Team contributes improvements to platform documentation and patterns
   - Team mentors other teams in container adoption
   - Team participates in platform community and governance
   - Team continuously experiments with and adopts emerging capabilities

**Context and Rationale:**

Team capability is often the limiting factor in successful platform adoption. Organizations invest in sophisticated platforms but overlook the human element—teams need time, support, and safe environments to learn. The progression from awareness to expertise typically takes months, and organizations should plan accordingly.

The most effective enablement combines multiple modalities: formal training establishes foundational knowledge, documentation provides reference material, embedded support (platform team office hours, chat channels) offers just-in-time help, and hands-on practice builds confidence. Teams learn best by doing, but need scaffolding to prevent frustration and failure.

Platform teams should measure and celebrate team capability growth. Teams that reach proficiency become ambassadors, helping accelerate subsequent teams. This multiplier effect turns platform adoption from linear to exponential as organizational capability compounds.

### Work Product: Onboarding Runbook

The Onboarding Runbook is the team's operational guide for their containerized application. It documents how to deploy, operate, monitor, and troubleshoot the application on the platform. This runbook captures institutional knowledge and ensures operational continuity even as team membership changes.

**Levels of Detail:**

**Level 1 - Basic:** Essential operational information is documented.

Characteristics and verification criteria:
- Deployment procedure is documented with step-by-step instructions
- Application architecture diagram shows container structure
- Key configuration parameters are listed and explained
- Contact information for platform support is included
- Rollback procedure is documented

This level provides evidence for:
- Container Application reaching Deployed state
- Team Container Capability reaching Capable state

**Level 2 - Comprehensive:** Complete operational playbook with troubleshooting guides.

Characteristics and verification criteria:
- Monitoring and alerting setup is fully documented
- Common failure modes and resolution steps are cataloged
- Scaling procedures (manual and automatic) are documented
- Incident response procedures are defined with roles
- Disaster recovery procedures are tested and validated
- Configuration management approach is documented
- Dependencies and integration points are mapped

This level provides evidence for:
- Container Application reaching Operational state
- Team Container Capability reaching Proficient state

**Level 3 - Living Documentation:** Dynamic operational knowledge base continuously improved.

Characteristics and verification criteria:
- Runbook is regularly updated based on operational learnings
- Automated checks validate runbook accuracy
- Troubleshooting includes actual incidents and resolutions
- Performance optimization techniques are documented
- Platform feature adoption guidance is included
- Team decision log captures architectural choices and rationale
- Runbook integrates with broader organizational knowledge base

This level provides evidence for:
- Container Application reaching Optimized state
- Team Container Capability reaching Expert state

**Usage and Context:**

The Onboarding Runbook evolves from a simple deployment guide to a comprehensive operational knowledge base. Early versions capture the basics—how to deploy, where to look when things break. Over time, teams add learnings from actual incidents, optimization discoveries, and platform feature adoption.

Well-maintained runbooks reduce operational risk and accelerate onboarding of new team members. They serve as forcing functions for operational thinking—writing down how to respond to failures forces teams to think through those scenarios before they happen. They also provide valuable feedback to platform teams about common pain points and knowledge gaps.

Platform teams should provide runbook templates that prompt teams to consider key operational concerns. These templates encode platform team wisdom about what matters for reliable operations, guiding application teams toward operational maturity.

## Activities and Responsibilities

### Solution Focus Activities

**Activity: Assess Application for Containerization**

This activity involves evaluating an existing application to determine its readiness for containerization and platform deployment. The assessment examines application architecture, dependencies, configuration, data management, and operational requirements. The goal is to identify containerization challenges early and plan mitigation strategies before investing significant effort.

This activity belongs to the **Define Platform Capabilities** activity space and focuses on understanding what the application needs from the platform to operate successfully.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Container Application** toward the **Assessed** state
- Progresses **Team Container Capability** toward the **Aware** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Onboarding Runbook** to the **Basic** level (documenting assessment findings)

**Required Capabilities:**

This work requires proficiency in:
- **Analysis** at Applies level (ability to assess architecture and identify dependencies)
- **Engineering** at Applies level (understanding of application design and containerization patterns)

**Team Involvement:**

This activity is typically performed by the **Application Development Team** with support from platform engineering.

**Context and Guidance:**

Assessment is often overlooked in the rush to containerize, but it's time well spent. Teams that skip assessment frequently encounter surprises mid-migration—undocumented dependencies, hardcoded configurations, or architectural patterns that clash with container models. These discoveries, made under deadline pressure, lead to compromises that create operational debt.

A thorough assessment examines multiple dimensions. Architecture analysis reveals whether the application is monolithic or already decomposed into services, whether it maintains state, and how it communicates with other systems. Dependency analysis catalogues external services, databases, file systems, and infrastructure assumptions. Configuration analysis identifies environment-specific settings, secrets, and runtime parameters that must be externalized. Operational analysis reviews current deployment procedures, monitoring practices, and scaling patterns.

The assessment should produce a clear containerization plan with identified risks and mitigation strategies. For example, if an application assumes local file system storage, the assessment might recommend adopting platform object storage or persistent volumes. If the application has hardcoded hostnames, the assessment might recommend configuration management approaches. These plans reduce risk and accelerate execution.

**Activity: Build Container Image**

This activity involves creating the container image that packages the application with all its dependencies. It includes writing the Dockerfile or build configuration, optimizing the image for size and security, implementing health checks, and establishing an automated build pipeline. The result is a production-ready container image that can be deployed to the platform.

This activity belongs to the **Architect and Build the Foundation** activity space and focuses on creating the core technical artifact for platform deployment.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Container Application** toward the **Containerized** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Container Image** to the **Optimized** level
- **Onboarding Runbook** to the **Basic** level (documenting image build process)

**Required Capabilities:**

This work requires proficiency in:
- **Engineering** at Masters level (ability to design effective container images and troubleshoot build issues)
- **Analysis** at Applies level (ability to optimize for size, security, and performance)

**Team Involvement:**

This activity is typically performed by the **Application Development Team**.

**Context and Guidance:**

Building effective container images requires understanding both the application and container best practices. Common pitfalls include using overly large base images, installing unnecessary dependencies, running as root, or creating images with excessive layers. These issues impact deployment speed, security posture, and operational costs.

Platform teams often provide base images and build templates that encode best practices. Application teams should start with these golden paths rather than building from scratch. A good base image already handles concerns like security updates, user configuration, and standard tooling. Build templates might implement multi-stage builds that separate build-time and runtime dependencies, or configure appropriate caching strategies.

Health check implementation deserves particular attention. Platforms rely on health checks to determine when containers are ready to receive traffic and when they need restart. A naive health check might simply verify the process is running, missing scenarios where the application is alive but unable to serve requests. Effective health checks validate that the application can perform its function—checking database connectivity, verifying cache availability, or testing critical dependencies.

**Activity: Create Platform Deployment Manifest**

This activity involves translating the containerized application into platform-specific deployment configurations. For Kubernetes environments, this means creating Deployment, Service, ConfigMap, Secret, and other resources. The manifest defines how the platform should run, expose, configure, and manage the application. This activity requires understanding both the application's operational needs and the platform's capabilities.

This activity belongs to the **Develop the Golden Paths** activity space and focuses on creating self-service deployment patterns.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Container Application** toward the **Integrated** state
- Progresses **Team Container Capability** toward the **Capable** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Platform Deployment Manifest** to the **Production-Ready** level
- **Onboarding Runbook** to the **Basic** level (documenting deployment procedures)

**Required Capabilities:**

This work requires proficiency in:
- **Engineering** at Applies level (understanding of platform deployment patterns)
- **Analysis** at Applies level (ability to translate requirements into platform configurations)

**Team Involvement:**

This activity is typically performed by the **Application Development Team** with guidance from the **Platform Engineering Team**.

**Context and Guidance:**

Creating deployment manifests is where teams must learn platform-specific patterns and abstractions. This learning curve can be steep, particularly for teams new to declarative configuration and Kubernetes concepts. Platform teams can dramatically accelerate onboarding by providing generators, templates, or higher-level abstractions.

For example, instead of expecting teams to hand-write complete Kubernetes YAML, a platform team might provide a Helm chart that prompts for application-specific values (name, image, resources) and generates comprehensive manifests with appropriate security policies, health checks, and observability integrations. This golden path approach ensures consistency while hiding complexity.

Teams should start with minimal manifests and progressively add sophistication. Initial versions might just get the application running. Subsequent iterations add health checks, multiple replicas, resource limits, configuration management, and advanced features. This incremental approach provides early wins while building understanding.

**Activity: Deploy to Non-Production Environment**

This activity involves deploying the containerized application to a development or staging environment on the platform. This first deployment to the actual platform (as opposed to local development) validates that manifests work correctly, integrations function, and the team understands deployment procedures. It provides a safe environment for learning and experimentation before production deployment.

This activity belongs to the **Operate and Evolve the System** activity space and focuses on validating the deployment approach.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Container Application** toward the **Deployed** state
- Progresses **Team Container Capability** toward the **Capable** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Onboarding Runbook** to the **Comprehensive** level (documenting actual deployment experience and issues encountered)

**Required Capabilities:**

This work requires proficiency in:
- **Engineering** at Applies level (ability to deploy and troubleshoot platform deployments)
- **Test** at Applies level (ability to validate deployment success and application functionality)

**Team Involvement:**

This activity is typically performed by the **Application Development Team** with support from the **Platform Engineering Team**.

**Context and Guidance:**

The first platform deployment is a critical learning moment. Teams discover gaps in their understanding, missing configurations, or integration issues. This is exactly what non-production environments are for—providing a safe space to fail, learn, and iterate. Platform teams should expect and support this learning process rather than treating deployment issues as failures.

Common issues during first deployments include incorrect image references, missing secrets or configuration, network connectivity problems, or resource constraint issues. Each issue provides learning—teams build troubleshooting skills and deepen their platform understanding. Well-designed platforms provide clear error messages and diagnostic tools that guide teams toward resolution.

Teams should use non-production deployments to validate operational procedures, not just technical functionality. Practice deploying updates, rolling back changes, scaling replicas, accessing logs, and responding to simulated failures. These rehearsals build confidence and identify procedure gaps before production stakes are real.

**Activity: Operate Containerized Application in Production**

This activity involves the ongoing operational responsibilities for a production containerized application. It includes monitoring application health, responding to alerts, deploying updates, managing scaling, performing troubleshooting, and continuously improving operational practices. This represents the long-term relationship between the team and their platform-hosted application.

This activity belongs to the **Operate and Evolve the System** activity space and focuses on maintaining and improving production systems.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Container Application** toward the **Operational** state
- Progresses **Container Application** toward the **Optimized** state
- Progresses **Team Container Capability** toward the **Proficient** state
- Progresses **Team Container Capability** toward the **Expert** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Onboarding Runbook** to the **Living Documentation** level
- **Platform Deployment Manifest** to the **Advanced** level

**Required Capabilities:**

This work requires proficiency in:
- **Engineering** at Masters level (deep troubleshooting and optimization capabilities)
- **Management** at Applies level (operational planning and continuous improvement)
- **Test** at Applies level (validation of changes and resilience testing)

**Team Involvement:**

This activity is typically performed by the **Application Operations Team** or **Full-Stack Development Team**.

**Context and Guidance:**

Production operations is where containerization's value becomes real. Teams experience faster deployments, more reliable scaling, and better resource efficiency. But they also face new operational realities—distributed systems complexity, ephemeral infrastructure, and platform-mediated access.

Successful teams establish operational rhythms. They regularly review metrics and costs, optimizing resource allocation. They conduct game days or chaos experiments to validate resilience. They update runbooks based on actual incidents. They participate in platform community discussions, learning from other teams' experiences and contributing their own insights.

Platform teams should provide operational support that evolves as teams mature. New teams need hands-on help and frequent check-ins. Proficient teams need less direct support but benefit from forums for sharing experiences. Expert teams can mentor others and contribute to platform improvement. This graduated support model scales platform team impact while building organizational capability.

### Value Focus Activities

**Activity: Assess Container Platform Value**

This activity involves evaluating the business value and return on investment of containerizing and onboarding applications to the platform. It examines expected benefits—faster deployment, better resource utilization, improved reliability—against migration costs and ongoing operational overhead. The assessment helps prioritize which applications to containerize and validates that the effort delivers expected value.

This activity belongs to the **Assess Business Value** activity space and focuses on business justification and prioritization.

**Outcomes and Alpha Progression:**

This activity advances the following areas of concern:
- Progresses **Opportunity** (baseline alpha) toward the **Determined** state
- Progresses **Platform Value And Economics** (baseline alpha) toward the **Modeled** state

**Work Products Created/Refined:**

This activity creates or updates:
- **Onboarding Runbook** to the **Basic** level (documenting value expectations and success criteria)

**Required Capabilities:**

This work requires proficiency in:
- **Analysis** at Masters level (ability to evaluate business impact and ROI)
- **Management** at Applies level (understanding of organizational priorities and constraints)

**Team Involvement:**

This activity is typically performed by the **Product Management Team** with input from application and platform teams.

**Context and Guidance:**

Not every application benefits equally from containerization. Legacy applications with complex dependencies might require substantial refactoring. Simple applications with infrequent deployments gain less from container deployment automation. Strategic applications that deploy frequently and need elastic scaling benefit significantly. Value assessment helps organizations prioritize investments appropriately.

The assessment should consider multiple value dimensions. Technical value includes deployment speed, scaling capabilities, and operational consistency. Economic value includes resource efficiency (better utilization through container density), reduced infrastructure costs, and operational efficiency. Strategic value includes skills development, platform ecosystem growth, and organizational agility.

Platform teams should provide tools and frameworks that help teams evaluate container suitability. A simple assessment might score applications across dimensions like deployment frequency, scaling needs, architectural compatibility, and team capability. This scoring helps prioritize onboarding efforts and identify applications that should wait for platform maturity or team readiness.

## Roles and Teams

### Individual Roles

**Role: Application Developer**

The Application Developer is responsible for building and maintaining application code that will run on the container platform. This role transforms from writing code for traditional infrastructure to writing code optimized for containerized, distributed environments. Application Developers must understand how their code will be packaged as containers, how it will be deployed and scaled, and how it will integrate with platform services.

This role requires strong engineering skills at the mastery level, combined with analytical thinking for troubleshooting distributed system issues. As teams adopt containers, developers take on more operational responsibility—understanding monitoring, logging, and resilience patterns. This shift aligns with DevOps principles where developers own their services end-to-end.

The Application Developer works closely with Platform Engineers who provide the platform capabilities and golden paths. They collaborate with other Application Developers on their team to establish containerization patterns and operational practices. Over time, experienced Application Developers may mentor other teams through their container adoption journey, serving as ambassadors for platform adoption.

**Role: Platform Engineer**

The Platform Engineer builds and maintains the container platform infrastructure and developer experience. They establish the golden paths that application teams follow—reference architectures, deployment templates, base container images, and self-service tools. Platform Engineers balance providing opinionated paths that encode best practices with maintaining flexibility for diverse application needs.

This role requires expert-level engineering capabilities spanning infrastructure, automation, and developer tooling. Platform Engineers must understand both the technical platform (Kubernetes, service mesh, observability tools) and the human platform (documentation, training, support). Strong leadership skills enable them to drive adoption through influence rather than mandate.

Platform Engineers work across many application teams, understanding common patterns and pain points. They continuously improve the platform based on feedback and operational learnings. They also serve as escalation points when application teams encounter complex platform issues, combining deep technical knowledge with diagnostic capabilities.

**Role: Product Manager**

The Product Manager for containerized applications maintains strategic ownership of the application and its business value. Even as deployment mechanisms change from traditional to containerized infrastructure, the Product Manager continues to prioritize features, make trade-off decisions, and connect technical work to business outcomes.

This role requires strong analytical and management skills at the applies level, with enough technical understanding to grasp containerization implications. Product Managers must evaluate whether container platform adoption supports their product strategy, understand how it affects delivery timelines, and ensure that technical transformations don't distract from customer value delivery.

The Product Manager collaborates with Application Developers and Platform Engineers to balance platform adoption with feature development. They help prioritize which applications to containerize when, based on business value and strategic importance. They also ensure that operational improvements from containerization—faster deployments, better scaling—translate into real customer benefits.

**Role: Site Reliability Engineer**

The Site Reliability Engineer (SRE) ensures that containerized applications meet reliability, performance, and operational requirements in production. As applications move to containers, SREs help teams adopt SRE practices—service level objectives, error budgets, systematic troubleshooting, and resilience engineering. They bridge the gap between development and operations in containerized environments.

This role requires expert-level engineering skills combined with strong analytical capabilities for problem diagnosis and performance optimization. SREs must understand distributed systems, container orchestration, and platform primitives while maintaining focus on customer-impacting reliability. Leadership skills enable them to drive cultural change toward reliability-focused practices.

SREs often embed with application teams during initial container adoption, providing hands-on support for production deployment and operational stabilization. Over time, they help teams develop self-sufficiency while maintaining oversight of reliability metrics and incident response. They also contribute platform improvements based on operational learnings.

### Team Structures

**Team: Application Development Team**

This team brings together Application Developers, Product Managers, and potentially SREs (in SRE-enabled organizations) to build, deploy, and operate containerized applications. The team is responsible for the end-to-end lifecycle of their applications on the platform.

The team's purpose is to deliver customer value through their applications while adopting platform capabilities that improve delivery speed, reliability, and operational efficiency. This team owns the containerization journey for their applications—from assessment through optimization—and maintains operational responsibility for their production services.

Application Development Teams work with varying degrees of autonomy based on their container platform maturity. New teams receive significant support from Platform Engineering Teams—guidance on containerization, help with manifest creation, and troubleshooting assistance. As teams mature, they become more self-sufficient, leveraging platform self-service capabilities and documentation. Expert teams may contribute back to the platform community, sharing patterns and mentoring other teams.

**Team: Platform Engineering Team**

This team comprises Platform Engineers, Developer Experience specialists, and potentially SREs focused on platform reliability. The team builds and operates the container platform as a product, treating application teams as their customers.

The team's purpose is to accelerate application delivery across the organization by providing a reliable, easy-to-use container platform with excellent developer experience. They establish golden paths, provide self-service tools, maintain comprehensive documentation, offer support through multiple channels, and continuously improve the platform based on feedback and operational learnings.

Platform Engineering Teams operate at the organizational level, serving many application teams. They balance standardization—establishing patterns that reduce complexity and improve reliability—with flexibility—enabling teams to solve unique problems. They measure success not just by platform uptime but by application team productivity, satisfaction, and adoption rates. Effective platform teams are deeply customer-focused, regularly engaging with application teams to understand needs and pain points.

**Team: Product Management Team**

This team includes Product Managers and business stakeholders who maintain strategic oversight of application portfolios and platform investments. They prioritize which applications should be containerized and when, based on business value, strategic importance, and team readiness.

The team ensures that technical platform adoption aligns with business strategy. They evaluate container platform investments against alternatives, assess return on investment, and make build-versus-buy decisions. They also ensure that platform adoption doesn't become an end in itself but serves business objectives.

Product Management Teams collaborate closely with both Application Development Teams and Platform Engineering Teams. They help application teams understand how platform capabilities can accelerate their roadmaps. They help platform teams prioritize capabilities based on business needs. They serve as a bridge between technical and business perspectives, ensuring alignment and shared understanding.

## Patterns and Workflows

### Pattern: Container Onboarding Lifecycle

**Type:** Lifecycle

The Container Onboarding Lifecycle represents the complete journey an application team follows when adopting the container platform. This pattern coordinates all the alphas, activities, and work products defined in this practice into a coherent progression from initial assessment through production operations and continuous optimization. The lifecycle provides a roadmap that helps teams understand where they are, what comes next, and what success looks like at each phase.

The lifecycle is organized into distinct phases, each building on the previous phase's accomplishments. Teams may progress through phases at different rates depending on application complexity, team experience, and organizational support. The pattern allows flexibility—teams can iterate within phases, return to earlier phases if needed, or accelerate through phases when conditions support rapid progress.

### Phase: Prerequisites

Before beginning the container onboarding journey, certain foundational elements must be in place. This phase ensures that teams have the basic understanding, access, and support needed to begin containerization work. Without these prerequisites, teams often encounter unnecessary friction and delays.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Team Container Capability** should reach the **Aware** state
- **Opportunity** (baseline alpha) should reach the **Initiated** state
- **Stakeholders** (baseline alpha) should reach the **Recognized** state

**Key Deliverables:**

At this phase, there are no specific work product instances yet—this is preparatory work.

**Active Work:**

The primary activity spaces active during this phase include:
- Assess Business Value
- Engage Platform Consumers

Specific activities being performed:
- Platform orientation and training
- Initial business value assessment
- Team capability evaluation

**Phase Context:**

The prerequisites phase is often underestimated or skipped entirely. Organizations eager to containerize rush teams into technical work without ensuring foundational readiness. This leads to confusion, frustration, and false starts. Teams need basic container literacy before they can make informed architectural decisions.

Platform teams should provide structured onboarding experiences during this phase. Orientation sessions introduce platform capabilities, demonstrate self-service tools, and explain support mechanisms. Documentation should be accessible and searchable. Training should combine conceptual learning with hands-on exercises in safe environments. Teams should complete this phase with clear mental models of how containers and platforms work.

Business value assessment during prerequisites helps ensure effort will be worthwhile. Not every application benefits from containerization, and not every team is ready. Honest assessment prevents wasted effort and sets realistic expectations. It also helps prioritize—if multiple teams are onboarding, which applications offer the most value and which teams have the best readiness?

### Phase: Assessment and Planning

The Assessment and Planning phase involves thoroughly evaluating the application for containerization and creating a detailed migration plan. Teams analyze architecture, dependencies, configuration, and operational requirements. They identify risks, plan mitigation strategies, and establish success criteria. The phase concludes with a clear roadmap for containerization work.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Assessed** state
- **Team Container Capability** should reach the **Aware** state
- **Opportunity** (baseline alpha) should reach the **Determined** state
- **Platform Value And Economics** (baseline alpha) should reach the **Modeled** state
- **Requirements** (baseline alpha) should reach the **Conceived** state

**Specific application instances tracked:**

- **Stateless Web Application** (if applicable) should reach **Assessed** state
- **Stateful Database Application** (if applicable) should reach **Assessed** state

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Onboarding Runbook** (general) should reach **Basic** level

**Active Work:**

The primary activity spaces active during this phase include:
- Define Platform Capabilities
- Assess Business Value

Specific activities being performed:
- Assess Application for Containerization
- Assess Container Platform Value

**Phase Context:**

Assessment is detective work. Teams investigate their applications, documenting what they find. Dependency mapping often reveals surprises—services the team had forgotten about, assumed infrastructure that won't exist in containers, or configurations buried in deployment scripts. These discoveries are valuable. Better to find them during planning than during deployment.

The assessment should produce actionable plans, not just documentation. For each identified challenge—say, hardcoded file system paths—the plan should outline the solution approach—migrate to object storage or configure persistent volumes. For each architectural concern—say, a monolithic database that creates scaling bottlenecks—the plan should note whether to refactor before containerizing or accept the limitation initially.

Teams should validate their assessments with platform engineers who can identify common pitfalls and suggest proven approaches. Platform teams have seen many containerization journeys and can provide pattern recognition—"teams with this architectural pattern usually find success with this approach." This consultation reduces risk and accelerates subsequent phases.

### Phase: Containerization

The Containerization phase focuses on building production-ready container images. Teams write Dockerfiles, optimize images for size and security, implement health checks, externalize configuration, and establish automated image build pipelines. This is hands-on technical work that transforms applications from traditional deployment artifacts to containerized packages.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Containerized** state
- **Team Container Capability** should remain at **Aware** state (capability growth happens with platform integration)
- **Platform** (baseline alpha) should reach **Conceived** state (understanding how the app will use platform)
- **Requirements** (baseline alpha) should reach **Bounded** state (understanding specific platform requirements)

**Specific application instances tracked:**

- **Stateless Web Application** (if applicable) should reach **Containerized** state
- **Application Service Image** should reach **Optimized** level

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Container Image** (Application Service Image instance) should reach **Optimized** level
- **Onboarding Runbook** should reach **Basic** level (documenting image build)

**Active Work:**

The primary activity spaces active during this phase include:
- Architect and Build the Foundation

Specific activities being performed:
- Build Container Image

**Phase Context:**

Containerization is where plans become reality. Teams write their first Dockerfiles, encountering practical questions: Which base image? How to handle secrets? Where do logs go? Platform teams can accelerate this phase by providing base images and build templates that answer these questions with proven patterns.

Early container builds often produce large, inefficient images. Teams learn through iteration—discovering multi-stage builds that separate build and runtime dependencies, understanding layer caching that speeds builds, and recognizing security implications of running as root. Platform teams should provide image scanning and feedback loops that guide teams toward best practices.

Testing containers locally is crucial before platform deployment. Teams should validate that images run correctly, that health checks behave as expected, and that configuration externalization works. Local testing with Docker Desktop or similar tools catches basic issues quickly, before the complexity of platform deployment is added.

### Phase: Platform Integration

The Platform Integration phase involves creating deployment manifests, configuring platform services, implementing observability, and establishing deployment automation. Teams translate their containerized application into platform-specific configurations and validate integration with platform capabilities. This phase requires learning platform patterns and abstractions.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Integrated** state
- **Team Container Capability** should reach the **Capable** state
- **Platform** (baseline alpha) should reach **Coherent** state (clear integration approach)
- **System** (baseline alpha) should reach **Demonstrable** state (integrated system can be demonstrated)
- **Requirements** (baseline alpha) should reach **Coherent** state (requirements are well-formed)

**Specific application instances tracked:**

- **Stateless Web Application** (if applicable) should reach **Integrated** state

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Platform Deployment Manifest** should reach **Production-Ready** level
- **Container Image** should remain at **Optimized** level
- **Onboarding Runbook** should reach **Basic** level (documenting deployment)

**Active Work:**

The primary activity spaces active during this phase include:
- Develop the Golden Paths
- Integrate Toolchain Services

Specific activities being performed:
- Create Platform Deployment Manifest

**Phase Context:**

Platform integration is the steepest learning curve for teams new to containers. Kubernetes manifests, with their verbosity and abstraction, can be overwhelming. Platform teams should provide generators or higher-level tools that hide complexity while teaching concepts progressively.

Integration testing happens in actual platform environments, not local simulations. Teams deploy to development namespaces, discovering integration issues: Can the application access the database? Are secrets properly mounted? Do health checks work in the platform context? Each issue provides learning about platform behavior and constraints.

Platform observability integration deserves focus during this phase. Teams should validate that logs flow to the platform logging system, that metrics are collected and visualizable, and that traces (if used) capture request flows. This observability becomes essential during deployment and operations phases.

### Phase: Non-Production Deployment

The Non-Production Deployment phase involves deploying the fully integrated application to development or staging environments. Teams practice deployment procedures, validate application behavior, perform load testing, and build operational confidence before production deployment. This phase is dress rehearsal for production.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Deployed** state
- **Team Container Capability** should reach the **Capable** state
- **System** (baseline alpha) should reach the **Usable** state (system is functional in real environment)
- **Work** (baseline alpha) should reach the **Prepared** state (ready for production deployment)

**Specific application instances tracked:**

- **Stateless Web Application** (if applicable) should reach **Deployed** state

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Onboarding Runbook** should reach **Comprehensive** level (incorporating deployment experience)
- **Platform Deployment Manifest** should remain at **Production-Ready** level

**Active Work:**

The primary activity spaces active during this phase include:
- Operate and Evolve the System
- Coordinate Delivery Sprints

Specific activities being performed:
- Deploy to Non-Production Environment

**Phase Context:**

Non-production deployment exposes real-world complexities that local testing misses. Network policies might block expected connections. Resource limits might be insufficient for realistic load. Scaling behaviors might not work as expected. These discoveries are gifts—finding and fixing issues in staging prevents production incidents.

Teams should treat non-production deployment as operational practice. Deploy updates, rollback changes, scale replicas, access logs, respond to synthetic alerts. Build muscle memory for these operations before production stakes are real. Document unexpected behaviors and their resolutions in the runbook.

Load testing during this phase validates resource allocation and scaling configurations. Many teams under-estimate resource needs or mis-configure autoscaling. Load testing provides data to right-size resource requests and validate that the application can handle expected traffic. It also tests platform infrastructure under load, identifying any capacity or performance issues.

### Phase: Production Deployment

The Production Deployment phase involves deploying the application to the production environment with appropriate monitoring, alerting, and support. Teams transition from project mode (building and testing) to operations mode (running and supporting). This phase marks the beginning of ongoing operational responsibility.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Operational** state
- **Team Container Capability** should reach the **Proficient** state
- **System** (baseline alpha) should reach the **Ready** state (fully operational in production)
- **Platform** (baseline alpha) should reach the **Functional** state (platform hosting production workload)
- **Work** (baseline alpha) should reach the **Started** state (team is operating the production system)
- **Ways Of Working** (baseline alpha) should reach the **Principles Established** state (operational practices defined)

**Specific application instances tracked:**

- **Stateless Web Application** (if applicable) should reach **Operational** state

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Onboarding Runbook** should reach **Comprehensive** level
- **Platform Deployment Manifest** should remain at **Production-Ready** level
- **Container Image** should reach **Hardened** level (production security standards)

**Active Work:**

The primary activity spaces active during this phase include:
- Operate and Evolve the System
- Establish Operational Practices

Specific activities being performed:
- Operate Containerized Application in Production

**Phase Context:**

Production deployment is a milestone but not the finish line. The first days and weeks in production are crucial for building operational muscle and validating that monitoring, alerting, and runbooks are effective. Teams should expect on-call rotations, alert refinement, and iterative improvements to operational practices.

Platform teams should provide active support during initial production deployment. Regular check-ins help teams feel supported and identify issues early. Platform engineers can validate monitoring setups, review alert configurations, and suggest optimizations based on observed patterns. This hands-on support builds confidence and accelerates capability development.

Teams should conduct retrospectives after production deployment, capturing lessons learned and updating runbooks with production insights. What worked well? What was more difficult than expected? What documentation gaps existed? These learnings improve the team's operational practices and help platform teams improve onboarding experiences for future teams.

### Phase: Optimization

The Optimization phase involves continuously improving the containerized application and adopting advanced platform capabilities. Teams refine resource usage, implement advanced scaling strategies, adopt service mesh or other platform features, and share learnings with the broader organization. This phase represents maturity and ongoing value realization.

**Areas of Concern at this Phase:**

By the end of this phase, the following concepts should reach these states:

- **Container Application** should reach the **Optimized** state
- **Team Container Capability** should reach the **Expert** state
- **Platform** (baseline alpha) should reach the **Baselined** state (application fully optimized for platform)
- **Platform Value And Economics** (baseline alpha) should reach the **Sustained** state (ongoing value realization)
- **Ways Of Working** (baseline alpha) should reach the **In Use** state (operational practices mature)

**Key Deliverables:**

At this phase, the following artifacts should reach these levels of detail:

- **Platform Deployment Manifest** should reach **Advanced** level
- **Container Image** should reach **Hardened** level
- **Onboarding Runbook** should reach **Living Documentation** level

**Active Work:**

The primary activity spaces active during this phase include:
- Operate and Evolve the System
- Manage Platform Economics
- Evangelize and Support

Specific activities being performed:
- Operate Containerized Application in Production (ongoing)
- Cost optimization and monitoring
- Knowledge sharing with other teams

**Phase Context:**

Optimization never truly ends—it's an ongoing practice of continuous improvement. Teams regularly review operational metrics, identifying opportunities for cost reduction, performance improvement, or reliability enhancement. They experiment with advanced platform features, evaluating whether capabilities like service mesh or advanced scheduling solve real problems for them.

Experienced teams become platform ambassadors, sharing knowledge through documentation contributions, presentations, or mentoring. This knowledge sharing multiplies platform team impact and accelerates organizational adoption. Platform teams should create forums for this sharing—communities of practice, internal conferences, or showcase sessions.

The optimization phase also involves giving back to the platform. Teams that have solved unique problems might contribute new golden paths or suggest platform improvements. This feedback loop between platform teams and application teams drives continuous platform evolution aligned with real user needs.

### Pattern Summary: Container Onboarding Lifecycle

Below is a summary view of how areas of concern and deliverables progress through this pattern:

| Area of Concern | Prerequisites | Assessment | Containerization | Platform Integration | Non-Prod Deploy | Production Deploy | Optimization |
|:----------------|:--------------|:-----------|:-----------------|:---------------------|:----------------|:------------------|:-------------|
| **Core Concepts** |||||||
| Container Application | — | Assessed | Containerized | Integrated | Deployed | Operational | Optimized |
| Team Container Capability | Aware | Aware | Aware | Capable | Capable | Proficient | Expert |
| Platform (baseline) | — | — | Conceived | Coherent | — | Functional | Baselined |
| Requirements (baseline) | — | Conceived | Bounded | Coherent | — | — | — |
| System (baseline) | — | — | — | Demonstrable | Usable | Ready | — |
| **Value Tracking** |||||||
| Opportunity (baseline) | Initiated | Determined | — | — | — | — | — |
| Platform Value And Economics | — | Modeled | — | — | — | — | Sustained |
| **Team and Work** |||||||
| Work (baseline) | — | — | — | — | Prepared | Started | — |
| Ways Of Working (baseline) | — | — | — | — | — | Principles Established | In Use |
| **Specific Instances** |||||||
| Stateless Web App | — | Assessed | Containerized | Integrated | Deployed | Operational | — |
| **Key Deliverables** |||||||
| Container Image | — | — | Optimized | Optimized | — | Hardened | Hardened |
| Platform Deployment Manifest | — | — | — | Production-Ready | Production-Ready | Production-Ready | Advanced |
| Onboarding Runbook | — | Basic | Basic | Basic | Comprehensive | Comprehensive | Living Documentation |

## Appendix: Terminology Mapping

The source methodology uses terminology that maps to baseline concepts as follows:

| Source Term | Baseline Concept | Type |
|:------------|:-----------------|:-----|
| Container Runtime Configuration | Platform | Alpha |
| Application Manifest | Requirements | Alpha |
| Deployment Pipeline | System | Alpha |
