# 🌿 Sidr – Spiritual Growth Meets Digital Gardening

**Sidr** is a mobile application that visually reflects your spiritual journey through reading the Quran. Every page you read nourishes a virtual tree in your garden, encouraging consistent practice while celebrating milestones like completing full recitations (Khatm).

---

## 🌟 Vision Statement

> "Turn every word of the Quran into roots, branches, and blossoms."

This app aims to blend mindfulness, motivation, and Islamic spirituality by transforming daily Quranic reading habits into an engaging, visual experience — where your commitment literally grows before your eyes.

---

## 🧩 Features Included in MVP

| Feature                        | Description |
|-------------------------------|-------------|
| Quran Reader Interface        | Basic view showing selected surah/ayat |
| Reading Session Tracking      | Start/pause/end sessions manually |
| Time & Page Metrics           | Tracks minutes spent and pages read |
| Tree Visualization            | Dynamic tree grows based on metrics |
| Basic Stats Dashboard         | Displays pages/time/day streak |
| Simple Badge Unlocking Logic  | Unlocks badges based on milestones |

---

## 🧰 Tech Stack

| Layer             | Technology Used                             |
|------------------|----------------------------------------------|
| Mobile Framework | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) |
| State Management | React Context API                            |
| Navigation       | `@react-navigation/native`                   |
| UI Components    | Built-in React Native components             |
| Graphics         | Unicode emojis/icons + future SVG integration |
| Persistence      | `AsyncStorage` (can upgrade to SQLite/Firebase later) |

---

## 🗂 Project Structure Overview

```
Sidr-app/
├── assets/                  # Images/icons
├── components/              # Reusable UI elements
│   ├── TreeView.jsx
│   └── ProgressBar.jsx
├── context/
│   └── AppContext.js        # Global state management
├── screens/
│   ├── HomeScreen.jsx
│   ├── ReadingScreen.jsx
│   └── StatsScreen.jsx
├── utils/
│   └── treeLogic.js         # Functions to determine tree stage
├── App.js                   # Main entry point
└── package.json
```

---

## 🧪 Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/en/download/)
- [npm](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/)
- Android Studio / Xcode (for iOS simulator)

Install dependencies:
```bash
npm install
```

Or if using Yarn:
```bash
yarn install
```

---

## ▶️ How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sidr.git
   cd sidr
   ```

2. Install packages:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npx expo start
   ```

4. Scan QR code with the Expo Go app (Android) or use iOS Simulator.

---

## 📱 Screens Walkthrough

### 🔹 Home Screen (`HomeScreen.jsx`)
Displays:
- Your current tree emoji/state
- Total pages read
- Minutes spent reading today
- Buttons to navigate to other screens

### 🔹 Reading Screen (`ReadingScreen.jsx`)
Allows user to:
- Start or stop a reading session
- Simulates reading a section from the Quran
- Updates global stats when session ends

### 🔹 Stats Screen (`StatsScreen.jsx`) *(Placeholder)*
Future enhancements will include:
- Graphs/charts of reading history
- Longest streaks
- Completion percentages per Juz’

---

## 🌳 Tree Logic Explanation

The tree evolves as follows:

| Stage       | Requirement                            |
|-------------|----------------------------------------|
| Seed        | Initial state                          |
| Sprout      | ≥ 20 pages read                        |
| Young Tree  | ≥ 100 pages read                       |
| Full Bloom  | ≥ 3 Khatms completed                   |
| Ancient Tree| Multiple years of consistent reading    |

These thresholds are defined in `utils/treeLogic.js`.

---

## 🎯 Planned Milestones (Beyond MVP)

| Milestone                         | Description |
|----------------------------------|-------------|
| Real Quran Content Fetching      | Integrate [Quran.com API](https://quran.api-docs.io/v4/) |
| Login & Cloud Sync               | Save progress securely online |
| Badges & Achievements            | Unlockable rewards for consistency |
| Reflection Journal               | Write thoughts after each reading |
| Community Challenges             | Compete with friends or groups |
| Charity Partnership              | Plant real trees upon Khatm completion |

---

## 🤝 Contributing

We welcome contributions!

To contribute:
1. Fork the repo
2. Create your feature branch: `git checkout -b feature/NewFeature`
3. Commit changes: `git commit -am 'Add some feature'`
4. Push to branch: `git push origin feature/NewFeature`
5. Submit a pull request

---

## 📄 License

MIT License – feel free to fork, modify, and distribute under attribution.

---

## 🙏 Credits

Inspired by:
- [Quran.com](https://quran.com)
- Gamified habit-building apps like Forest and Habitica
- Islamic traditions emphasizing continuous learning and reflection

---

## 📞 Support / Questions?

Reach out via:
- Email: [you@example.com](mailto:you@example.com)
- GitHub Issues: [Open Issue](https://github.com/yourusername/Sidr-app/issues)

---

Happy coding and may your tree flourish with every page 🌱📖

--- 

Let me know if you'd like this exported as a downloadable `.md` file or hosted on GitHub/GitLab for collaboration!
