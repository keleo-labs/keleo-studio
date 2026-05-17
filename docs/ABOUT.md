# Modular Team Architecture: Building Adaptable Ways of Working

## The Problem with Traditional Methodologies

In the software industry, traditional methodologies often act like "method prisons." Teams are frequently forced to adopt monolithic processes wholesale, discarding good practices just to comply with a rigid, branded method. This creates constant tension: a framework needs to provide guiding principles and help teams make decisions, yet it must also offer specific guidance without being so general that it provides little real help. We need a way to support a variety of scenarios and technologies without locking teams into a rigid, one-size-fits-all approach.

## The Vision for an Extensible Framework

How can we support adaptability in how we work and organize ourselves? The objective is to establish an underlying "baseline framework" that acts as an extensible platform for developing and expressing new approaches.

This is not a new idea. It was first developed by Ivar Jacobson in the late 2000s. Jacobson worked to standardize this model through SEMAT (Software Engineering Method and Theory), an initiative launched in 2009 by Ivar Jacobson, Bertrand Meyer, and Richard Soley. Its goal was to "refound" software engineering as a rigorous, theory-driven discipline by moving it away from fad-driven, subjective practices and establishing a universally accepted set of core concepts. Learn more at [SEMAT Essence](https://www.semat.org/).

This project derives from SEMAT concepts, borrowing aspects of the underlying language and adapting them to provide more opportunities for building composable practices with enhanced guidance and instruction. However, it does not redefine a Software Engineering baseline; instead, it encourages alternative baselines that may better fit today's needs.

An example is the **Platform Adoption Baseline**, which provides a universal foundation divided into three areas—Customer, Solution, and Endeavor—and outlines the essential "moving parts" of an endeavor without rigidly dictating exactly *how* a team must work. It offers a standard vocabulary and map, giving teams the freedom to develop and adopt new techniques.

## The Technology Analogy: Why Can't Our Methods Work Like Our Tech?

Think about how we make technology decisions when faced with many choices. When building a Kubernetes platform, you start with a standard, extensible base. Because the platform is extensible, it fosters a rich ecosystem of community projects. You can easily make specific technology choices—like selecting a service proxy—based on your team's unique strengths and needs. The underlying platform doesn't lock you into a specific approach or technology.

*Why can't our methods and approaches work like this?*

## Mixing and Matching for a Tailored Approach

What if you could mix and match different practices just like you mix and match technology choices? By codifying practices in a modular, granular form, teams are no longer trapped inside a single methodology. Instead of adopting a massive, inflexible toolkit wholesale, teams can select specific, complementary "tools" (practices) to create a tailored approach. This empowers teams to respond to their immediate challenges while sharing a common baseline.

## Adapting to Different Platforms

Today, organizations are creating a wide variety of platforms, each with unique challenges:

- A platform to manage IT infrastructure automation
- A platform for container-based software development
- A platform for managing virtual machines (workloads)
- A platform for data scientists and ML Ops developing and delivering AI solutions

### Common Core, Specialized Practices

Across all these platforms, teams might rely on common, universal practices—for example, applying **Site Reliability Engineering (SRE)** to systematically balance release velocity with operational stability, or using **GitOps** for automated delivery pipelines.

However, because these teams are building on an extensible baseline framework, they don't have to stop at common practices. They can seamlessly mix in highly specific, specialized practices that address their particular business or technical needs.

## Conclusion

By breaking practices out of monolithic methodologies and placing them on a standard, extensible baseline framework, we empower teams to dynamically adapt their ways of working, mixing and matching the exact practices they need to successfully navigate their unique challenges.
