import pandas as pd
from typing import List, Dict, Optional


# =========================================================
# TARGET-LIKE COLUMN NAMES
# =========================================================

TARGET_KEYWORDS = [
    "target",
    "label",
    "class",
    "outcome",
    "output",
    "prediction",
    "response",
    "y",
    "churn",
    "fraud",
    "default",
    "survived",
    "survival",
    "price",
    "sales",
    "revenue",
    "profit",
    "score",
]


# =========================================================
# DETECT PROBLEM TYPE
# =========================================================

def detect_problem_type(
    series: pd.Series,
) -> str:

    """
    Determine whether a target is likely to represent
    a classification or regression problem.
    """

    # Remove missing values
    clean_series = series.dropna()

    if len(clean_series) == 0:
        return "unknown"

    # ---------------------------------------------
    # Categorical / text / boolean
    # ---------------------------------------------

    if (
        pd.api.types.is_object_dtype(series)
        or pd.api.types.is_categorical_dtype(series)
        or pd.api.types.is_bool_dtype(series)
    ):
        return "classification"

    # ---------------------------------------------
    # Numeric target
    # ---------------------------------------------

    if pd.api.types.is_numeric_dtype(series):

        unique_count = clean_series.nunique()

        # A numeric column with very few unique values
        # is more likely to represent classes.
        if unique_count <= 10:
            return "classification"

        return "regression"

    return "unknown"


# =========================================================
# TARGET CANDIDATE SCORING
# =========================================================

def calculate_target_score(
    df: pd.DataFrame,
    column: str,
) -> int:

    score = 0

    series = df[column]

    column_lower = column.lower()

    # ---------------------------------------------
    # 1. Target-like column name
    # ---------------------------------------------

    for keyword in TARGET_KEYWORDS:

        if keyword in column_lower:

            score += 50
            break

    # ---------------------------------------------
    # 2. Exclude constant columns
    # ---------------------------------------------

    unique_count = series.nunique(
        dropna=True
    )

    if unique_count <= 1:
        return -100


    # ---------------------------------------------
    # 3. Exclude obvious ID-like columns
    # ---------------------------------------------

    total_rows = len(df)

    if total_rows > 0:

        cardinality_ratio = (
            unique_count / total_rows
        )

        if cardinality_ratio >= 0.9:

            score -= 50


    # ---------------------------------------------
    # 4. Reasonable target cardinality
    # ---------------------------------------------

    if unique_count == 2:

        score += 30

    elif 2 < unique_count <= 10:

        score += 20

    elif 10 < unique_count <= 50:

        score += 10


    # ---------------------------------------------
    # 5. Target should generally not be completely
    #    missing
    # ---------------------------------------------

    missing_percentage = (
        series.isnull().mean() * 100
    )

    if missing_percentage == 0:

        score += 10

    elif missing_percentage < 10:

        score += 5

    elif missing_percentage >= 50:

        score -= 20


    # ---------------------------------------------
    # 6. Last-column heuristic
    # ---------------------------------------------

    if column == df.columns[-1]:

        score += 10


    return score


# =========================================================
# GENERATE TARGET CANDIDATES
# =========================================================

def get_target_candidates(
    df: pd.DataFrame,
) -> List[Dict]:

    candidates = []

    for column in df.columns:

        score = calculate_target_score(
            df,
            column,
        )

        # Ignore clearly unsuitable columns
        if score < 0:
            continue

        series = df[column]

        problem_type = detect_problem_type(
            series
        )

        unique_count = int(
            series.nunique(dropna=True)
        )

        missing_count = int(
            series.isnull().sum()
        )

        total_rows = len(df)

        if total_rows > 0:

            missing_percentage = round(
                missing_count / total_rows * 100,
                2,
            )

        else:

            missing_percentage = 0.0


        candidates.append({
            "column": column,
            "score": score,
            "problem_type": problem_type,
            "unique_values": unique_count,
            "missing_values": missing_count,
            "missing_percentage": missing_percentage,
        })


    # Highest score first
    candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return candidates


# =========================================================
# GENERATE TARGET DETECTION RESULT
# =========================================================

def detect_target(
    df: pd.DataFrame,
) -> Dict:

    candidates = get_target_candidates(df)

    # ---------------------------------------------
    # No candidate found
    # ---------------------------------------------

    if not candidates:

        return {
            "recommended_target": None,
            "problem_type": "unknown",
            "confidence": "low",
            "reason": (
                "No suitable target column could "
                "be identified automatically."
            ),
            "candidates": [],
        }


    # ---------------------------------------------
    # Best candidate
    # ---------------------------------------------

    best_candidate = candidates[0]

    target_column = best_candidate["column"]

    problem_type = best_candidate["problem_type"]

    score = best_candidate["score"]


    # ---------------------------------------------
    # Confidence
    # ---------------------------------------------

    if score >= 80:

        confidence = "high"

    elif score >= 50:

        confidence = "medium"

    else:

        confidence = "low"


    # ---------------------------------------------
    # Reason
    # ---------------------------------------------

    if problem_type == "classification":

        reason = (
            f"{target_column} appears suitable as a "
            "classification target because it contains "
            f"{best_candidate['unique_values']} unique values."
        )

    elif problem_type == "regression":

        reason = (
            f"{target_column} appears suitable as a "
            "regression target because it is numeric and "
            f"contains {best_candidate['unique_values']} "
            "unique values."
        )

    else:

        reason = (
            f"{target_column} was identified as a possible "
            "target, but its problem type could not be "
            "determined automatically."
        )


    return {
        "recommended_target": target_column,
        "problem_type": problem_type,
        "confidence": confidence,
        "reason": reason,
        "candidates": candidates,
    }