from typing import Dict

import pandas as pd

from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.tree import DecisionTreeClassifier


def get_classification_models() -> Dict:
    """
    Return the classification models used by InsightForgeAI.
    """

    return {
        "Logistic Regression": LogisticRegression(
            max_iter=1000,
            random_state=42,
        ),
        "Decision Tree": DecisionTreeClassifier(
            random_state=42,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            random_state=42,
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            random_state=42,
        ),
    }


def evaluate_classification_model(
    model,
    X_test,
    y_test,
) -> Dict:
    """
    Generate predictions and calculate classification metrics.
    """

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0,
    )

    return {
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
    }


def run_classification_automl(
    X_train,
    X_test,
    y_train,
    y_test,
) -> Dict:
    """
    Train and evaluate multiple classification models.
    """

    models = get_classification_models()

    results = []

    for model_name, model in models.items():

        # Train the model
        model.fit(
            X_train,
            y_train,
        )

        # Evaluate the model
        metrics = evaluate_classification_model(
            model,
            X_test,
            y_test,
        )

        results.append({
            "model": model_name,
            **metrics,
        })

    # Sort models by F1 score
    results.sort(
        key=lambda item: item["f1_score"],
        reverse=True,
    )

    return {
        "problem_type": "classification",
        "models_tested": len(results),
        "results": results,
    }