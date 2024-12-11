# Contributing to DashPets

Thank you for considering contributing to DashPets! We appreciate your help in improving the project.

This guide outlines best practices for contributing, submitting issues, creating pull requests (PRs), and adding new pets.

---

## Reporting Issues
When submitting an issue, please provide:
1. **Clear Title:** Summarize the issue in a concise title.
2. **Description:** Provide details about the problem, including steps to reproduce it.
3. **Environment:** Mention relevant environment details, such as the browser, operating system, or device.
4. **Screenshots (Optional):** Add images to clarify the issue if possible.

---

## Creating Pull Requests
To submit a pull request:
1. **Fork the Repository:**
   ```bash
   git fork https://github.com/yourusername/dashpets.git
   ```
2. **Create a Branch:** Name your branch descriptively, such as `feature/new-pet` or `bugfix/tooltip-issue`.
   ```bash
   git checkout -b feature/new-pet
   ```
3. **Write Clean Code:**
   - Follow the existing code style.
   - Test thoroughly before committing.

4. **Add Descriptive Commit Messages:**
   - Use clear, concise commit messages to explain your changes.

5. **Open the Pull Request:**
   - Provide a detailed description of the changes.
   - Link to any related issues or discussions.

6. **Review and Feedback:** Be open to constructive feedback from the maintainers.

---

## Adding a New Pet
When adding a new pet, please follow these guidelines:

### Animation Assets
- **Image Format:** Use square images with a consistent aspect ratio.
- **Resolution:** Ensure the images are optimized for web use without losing quality.
- **Animation Types:** Provide at least 2 images per animation type:
  - **Walk** (mandatory)
  - **Run** (mandatory)
  - **Sit** (mandatory)
  - **Sleep** (mandatory)
- Name the image files clearly (e.g., `cat_walk_1.png`, `cat_run_2.png`).

### Testing
- Test the new pet animations in development mode (`yarn dev`).
- Verify smooth transitions between animation states.

---

## Best Practices
- **Code Consistency:** Follow the existing structure and use meaningful variable names.
- **Documentation:** Update any relevant documentation if your changes introduce new features.
- **Respect:** Be respectful and collaborative when interacting with other contributors.

---

We look forward to your contributions!
