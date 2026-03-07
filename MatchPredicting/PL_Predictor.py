import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score

# Load data from matches.2.csv
matches = pd.read_csv("matches.2.csv", index_col=0)

# Convert Date to datetime
matches["date"] = pd.to_datetime(matches["Date"])

# Prepare Home team data
home_df = matches[["date", "Home", "Away", "xG", "Home Goals", "Away Goals", "Venue"]].copy()
home_df.rename(columns={
    "Home": "team",
    "Away": "opponent",
    "xG": "xg_for",
    "Home Goals": "goals_for",
    "Away Goals": "goals_against"
}, inplace=True)
home_df["h/a"] = 1  # Home team indicator

def get_result_home(row):
    if row["goals_for"] > row["goals_against"]:
        return "W"
    elif row["goals_for"] == row["goals_against"]:
        return "D"
    else:
        return "L"
home_df["result"] = home_df.apply(get_result_home, axis=1)
home_df["target"] = (home_df["result"] == "W").astype(int)

# Prepare Away team data
away_df = matches[["date", "Away", "Home", "xG.1", "Away Goals", "Home Goals", "Venue"]].copy()
away_df.rename(columns={
    "Away": "team",
    "Home": "opponent",
    "xG.1": "xg_for",
    "Away Goals": "goals_for",
    "Home Goals": "goals_against"
}, inplace=True)
away_df["h/a"] = 0  # Away team indicator

def get_result_away(row):
    if row["goals_for"] > row["goals_against"]:
        return "W"
    elif row["goals_for"] == row["goals_against"]:
        return "D"
    else:
        return "L"
away_df["result"] = away_df.apply(get_result_away, axis=1)
away_df["target"] = (away_df["result"] == "W").astype(int)

# Combine home and away data
all_matches = pd.concat([home_df, away_df], ignore_index=True)

# Encode categorical variables
all_matches["opp"] = all_matches["opponent"].astype("category").cat.codes
all_matches["team_cat"] = all_matches["team"].astype("category").cat.codes

# Add day of week
all_matches["day"] = all_matches["date"].dt.dayofweek

# No time info, create dummy hour = 0
all_matches["hour"] = 0

# Select predictors
predictors = ["h/a", "opp", "hour", "day", "xg_for"]

# Split data
split_date = pd.to_datetime("2023-08-15")
train = all_matches[all_matches["date"] < split_date]
test = all_matches[all_matches["date"] >= split_date]

# Train model
rf = RandomForestClassifier(n_estimators=100, min_samples_split=10, random_state=1)
rf.fit(train[predictors], train["target"])

# Predict
preds = rf.predict(test[predictors])

# Evaluate
acc = accuracy_score(test["target"], preds)
prec = precision_score(test["target"], preds)

print(f"Model accuracy: {acc:.3f}")
print(f"Model precision: {prec:.3f}")

# Prepare test results with predictions
test_results = test.copy()
test_results["prediction"] = preds

# Add lowercase team column for case-insensitive matching
test_results["team_lower"] = test_results["team"].str.lower()

# 1. Print first 5 predictions as a sample
print("\nFirst 5 predictions (sample of all test games):")
print(test_results[["date", "team", "opponent", "target", "prediction", "result"]].head())

# 2. Interactive loop for user input
while True:
    team_input = input("\nEnter your favourite team name to see all its predictions and outcomes (or type 'all' to see all predictions, 'quit' to exit): ").strip().lower()

    if team_input == "quit":
        print("Goodbye!")
        break
    elif team_input == "all":
        print("\nAll predictions for all test games:")
        print(test_results[["date", "team", "opponent", "target", "prediction", "result"]])
    else:
        team_preds = test_results[test_results["team_lower"] == team_input]
        if team_preds.empty:
            print(f"No predictions found for team '{team_input}'. Please check the spelling.")
        else:
            print(f"\nAll predictions for {team_input.title()}:")
            print(team_preds[["date", "opponent", "target", "prediction", "result"]])
