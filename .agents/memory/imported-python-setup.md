---
name: Imported Python setup
description: Replit runtime behavior to remember when setting up imported Python applications
---

Imported projects can initially expose a base Python runtime that has no
package manager available to the project environment. Dependency installation
then fails against the immutable system even when Python itself is present.

**Why:** The imported project started with a base Python module, and its first
dependency installation attempt was rejected because `pip` was unavailable and
the system environment was externally managed.

**How to apply:** When an imported Python project needs dependencies, select a
package-enabled Python tools module first, then install the declared
requirements through the package manager. Do not create a virtual environment.