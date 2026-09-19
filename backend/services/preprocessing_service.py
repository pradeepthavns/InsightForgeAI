from typing import Dict

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def prepare_dataset(
    df: pd.DataFrame,
    target_column: str,
    test_size: float = 0.2,
) -> Dict:
    """
    Prepare a dataset for machine-learning models.

    Steps:
    1. Validate target column
    2. Remove rows with missing target values
    3. Separate features and target
    4. Identify numerical and categorical columns
    5. Build preprocessing pipelines
    6. Split data into training and testing sets
    7. Fit preprocessing only on training data
    8. Transform training and testing data
    """

    # ---------------------------------------------------------
    # 1. Validate target column
    # ---------------------------------------------------------

    if target_column not in df.columns:
        raise ValueError(
            f"Target column '{target_column}' was not found."
        )

    if df[target_column].nunique(dropna=True) < 2:
        raise ValueError(
            "Target column must contain at least two unique values."
        )

    # ---------------------------------------------------------
    # 2. Remove rows where target is missing
    # ---------------------------------------------------------

    df = df.dropna(subset=[target_column]).copy()

    if len(df) < 5:
        raise ValueError(
            "Dataset has too few usable rows after removing "
            "missing target values."
        )

    # ---------------------------------------------------------
    # 3. Separate features and target
    # ---------------------------------------------------------

    X = df.drop(columns=[target_column])
    y = df[target_column]

    # ---------------------------------------------------------
    # 4. Identify numerical and categorical columns
    # ---------------------------------------------------------

    numeric_columns = X.select_dtypes(
        include="number"
    ).columns.tolist()

    categorical_columns = X.select_dtypes(
        include=["object", "category", "bool"]
    ).columns.tolist()

    # ---------------------------------------------------------
    # 5. Numerical preprocessing
    # ---------------------------------------------------------

    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
        ]
    )

    # ---------------------------------------------------------
    # 6. Categorical preprocessing
    # ---------------------------------------------------------

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse=False,
                ),
            ),
        ]
    )

    # ---------------------------------------------------------
    # 7. Combine preprocessing pipelines
    # ---------------------------------------------------------

    transformers = []

    if numeric_columns:
        transformers.append(
            (
                "numeric",
                numeric_pipeline,
                numeric_columns,
            )
        )

    if categorical_columns:
        transformers.append(
            (
                "categorical",
                categorical_pipeline,
                categorical_columns,
            )
        )

    if not transformers:
        raise ValueError(
            "No usable feature columns were found."
        )

    preprocessor = ColumnTransformer(
        transformers=transformers,
        remainder="drop",
    )

    # ---------------------------------------------------------
    # 8. Detect problem type
    # ---------------------------------------------------------

    problem_type = "classification"

    if (
        pd.api.types.is_numeric_dtype(y)
        and y.nunique() > 10
    ):
        problem_type = "regression"

    # ---------------------------------------------------------
    # 9. Train/test split
    # ---------------------------------------------------------

    if problem_type == "classification":

        class_counts = y.value_counts()

        can_stratify = (
            len(class_counts) > 1
            and class_counts.min() >= 2
        )

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=42,
            stratify=y if can_stratify else None,
        )

    else:

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=42,
        )

    # ---------------------------------------------------------
    # 10. Fit preprocessing ONLY on training data
    # ---------------------------------------------------------

    X_train_processed = preprocessor.fit_transform(
        X_train
    )

    X_test_processed = preprocessor.transform(
        X_test
    )

    # ---------------------------------------------------------
    # 11. Get generated feature names
    # ---------------------------------------------------------

    try:
        feature_names = (
            preprocessor
            .get_feature_names_out()
            .tolist()
        )
    except Exception:
        feature_names = []

    # ---------------------------------------------------------
    # 12. Return results
    # ---------------------------------------------------------

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "X_train_processed": X_train_processed,
        "X_test_processed": X_test_processed,
        "preprocessor": preprocessor,
        "feature_names": feature_names,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "problem_type": problem_type,
        "original_rows": len(df),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "processed_features": X_train_processed.shape[1],
    }


def get_preprocessing_summary(
    result: Dict,
) -> Dict:
    """
    Convert preprocessing results into
    JSON-friendly information for the frontend.
    """

    return {
        "problem_type": result["problem_type"],
        "original_rows": result["original_rows"],
        "train_rows": result["train_rows"],
        "test_rows": result["test_rows"],
        "numeric_columns": result["numeric_columns"],
        "categorical_columns": result["categorical_columns"],
        "processed_features": result["processed_features"],
        "feature_names": result["feature_names"],
        "steps": [
            "Missing numerical values filled using median.",
            "Missing categorical values filled using most frequent value.",
            "Categorical features encoded using One-Hot Encoding.",
            "Numerical features standardized using StandardScaler.",
            "Dataset split into training and testing sets.",
            "Preprocessing fitted only on training data to prevent data leakage.",
        ],
    }
