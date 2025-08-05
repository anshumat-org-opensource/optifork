```markdown
# 🧪 OptiFork - Feature Flag & Experimentation Platform

OptiFork is a lightweight platform for managing **feature flags**, **targeting gates**, and **A/B experiments** with variant assignments and exposure logging.


1. **Navigate to backend**
   ```bash
   cd backend
````

2. **Set up virtual environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server**

   ```bash
   uvicorn main:app --reload
   ```

   The API will be live at: `http://localhost:8000`

---

## 🎨 Frontend Setup

1. **Navigate to frontend**

   ```bash
   cd frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run frontend**

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

---

## 🔌 API Overview

| Endpoint                                             | Method | Description                |
| ---------------------------------------------------- | ------ | -------------------------- |
| `/experiments`                                       | `POST` | Create a new experiment    |
| `/experiments`                                       | `GET`  | List all experiments       |
| `/experiments/{experiment_name}/assign?user_id={id}` | `GET`  | Assign a user to a variant |
| `/experiments/{experiment_name}/exposure`            | `POST` | Log exposure for user      |
| `/experiments/results`                               | `GET`  | View experiment results    |

---

## 🧪 Sample Experiment JSON

```json
{
  "name": "pricing_test",
  "description": "A/B test on new pricing model",
  "flag_id": 1,
  "variants": [
    { "name": "control", "traffic_split": 0.5 },
    { "name": "variant_a", "traffic_split": 0.5 }
  ]
}


## 👨‍💻 Author

Built with ❤️ by [Anupam Singh](https://github.com/anupamprataps)

