# 🦊 Predator-Prey Simulation 🐰🌿

An interactive, grid-based ecosystem simulation built with Next.js and TypeScript. Watch predators hunt prey, prey graze on grass, and the environment evolve in real-time. Explore natural selection, population dynamics, and ecosystem balance through a customizable and visually engaging experience.

---

## ✨ Features

- **Dynamic Ecosystem:** Predators, prey, and grass interact on a responsive grid.
- **Realistic Behavior:** Predators chase prey; prey graze and evade.
- **Population Graphs:** Track species populations with real-time charts.
- **Customizable Settings:** Tweak grid size, reproduction rates, energy dynamics, and more.
- **Simulation Controls:** Start, pause, reset, and adjust speed on the fly.
- **Responsive Design:** Optimized for desktop and mobile.
- **Persistent State:** Auto-saves progress using IndexedDB.
- **Theme Support:** Toggle between light and dark modes.

---

## 🛠️ Installation

Get started in just a few steps:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/izuc/predator-prey-simulation.git
   cd predator-prey-simulation
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open your browser to [http://localhost:3000](http://localhost:3000) and start simulating! 🎉

---

## 🎮 Usage

1. **Launch the Simulation:** Visit the app in your browser.
2. **Interact with Controls:**
   - **Start/Pause:** Toggle the simulation.
   - **Reset:** Restart with initial conditions.
   - **Speed:** Adjust simulation pace (Very Slow to Very Fast).
3. **Tune Settings:** Modify population sizes, reproduction rates, and energy values in the "Simulation Settings" panel.
4. **Monitor Dynamics:** Watch the graph and event log for real-time updates.

---

## ⚙️ Customization

- **Settings:** Edit default values in `components/PredatorPreySimulation.tsx` under the `settings` state.
- **Logic:** Adjust behavior in `utils/simulation.ts` for custom rules (e.g., movement, reproduction).
- **Styling:** Modify `app/globals.css` or Tailwind config for a unique look.

---

## 🧰 Tech Stack

- **Next.js 14** – React framework for SSR and static generation.
- **TypeScript** – Type-safe development.
- **TailwindCSS** – Utility-first styling with dark mode.
- **Recharts** – Dynamic population charts.
- **IndexedDB** – Local storage for simulation state.
- **Radix UI** – Accessible, unstyled UI components.

---

## 🤝 Contributing

Love the project? Contributions are welcome!

1. Fork the repo.
2. Create a branch (`git checkout -b feature/awesome-idea`).
3. Commit your changes (`git commit -m "Add awesome idea"`).
4. Push to your branch (`git push origin feature/awesome-idea`).
5. Open a Pull Request!

Feel free to suggest features, report bugs, or improve documentation.

---

## 🙌 Acknowledgments

- Built by [Lance](https://lance.name).
- Inspired by classic predator-prey models and interactive simulations.
