# Pilot Fitness Score System

This scoring system helps pilots understand their flight fitness by looking at three key metrics:

1. **Fitness Score** – Overall flying fitness (0.0 to 1.0).
2. **Experience Score** – Measures the pilot’s total activity over the past 12 months.
3. **Recency Score** – Measures how recently the pilot last flew, with an adjustment for experience.

---

## 1️ Fitness Score

**What is it?**

* The main score showing the pilot’s overall flight fitness.

**Formula:**

```
Fitness Score = (Weight_Recency * Recency Score) 
              + (Weight_Experience * Experience Score)
```

**Default Weights:**

* Weight\_Recency = 0.5
* Weight\_Experience = 0.5

---

## 2️ Experience Score

**What is it?**

* Measures overall flying activity over the last 12 months.
* Higher = more experienced pilot.

**Formula:**

```
Flights Score = min(Flights in 12m / 50, 1.0)
Hours Score = min(Hours in 12m / 100, 1.0)
Experience Score = (Flights Score + Hours Score) / 2
```

**Notes:**

* 50 flights/year = very active.
* 100 hours/year = very experienced.

---

## 3️ Recency Score

**What is it?**

* Measures how recently the pilot last flew.
* Adjusts for experience — high-experience pilots decay slower.

**Steps:**

### 1. Calculate the **Adjusted Decay Rate (k):**

```
Adjusted k = Base k / (0.5 + 0.5 * Experience Score)
```

* Base k (default) = 0.05
* Higher experience → lower decay rate.

### 2. Calculate the **Raw Recency Score:**

```
Raw Recency Score = exp(-Adjusted k * Days Since Last Flight)
```

* Days Since Last Flight = number of days since the pilot’s last flight.

### 3. Scale the **Raw Recency Score** by experience to get the final Recency Score:

```
Recency Score = Raw Recency Score * (0.5 + 0.5 * Experience Score)
```

* This prevents low-experience pilots from getting a perfect score from just one flight.

---

## Putting It All Together

**Example:**

* Days Since Last Flight: 30
* Flights in 12m: 10
* Hours in 12m: 20

### Experience Score:

* Flights Score = min(10/50, 1.0) = 0.2
* Hours Score = min(20/100, 1.0) = 0.2
* Experience Score = (0.2 + 0.2) / 2 = 0.2

### Adjusted k:

* Adjusted k = 0.05 / (0.5 + 0.5 \* 0.2) ≈ 0.083

### Raw Recency Score:

* Raw Recency Score = exp(-0.083 \* 30) ≈ 0.082

### Final Recency Score:

* Recency Score = 0.082 \* (0.5 + 0.5 \* 0.2) ≈ 0.049

### Fitness Score:

* Fitness Score = 0.5 \* 0.049 + 0.5 \* 0.2 = 0.1245

---

## Summary

| Score         | Purpose                          |
| ------------- | -------------------------------- |
| Fitness Score | Overall flying fitness.          |
| Experience    | Shows total flying in 12 months. |
| Recency       | Shows how fresh the pilot is.    |

This makes it super easy for pilots to **self-evaluate** and for instructors to **guide** them.
