from __future__ import annotations

from typing import Any, Dict, List


def build_ai_context(
    df,
    profile: Dict[str, Any],
    eda: Dict[str, Any],
    findings: List[Dict[str, Any]],
    target_detection: Dict[str, Any],
    automl_result: Dict[str, Any] = None,
) -> Dict[str, Any]:
    """
    Build a structured context object for the InsightForgeAI
    insight-generation layer.

    All numerical analysis is calculated by Python.
    This function only organizes the results.
    """

    context = {
        "dataset": {
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "column_names": df.columns.tolist(),
        },

        "data_quality": {
            "quality_score": profile.get(
                "data_quality_score",
                0,
            ),
            "total_missing_values": profile.get(
                "total_missing_values",
                0,
            ),
            "missing_percentages": profile.get(
                "missing_percentages",
                {},
            ),
            "duplicate_rows": profile.get(
                "duplicate_rows",
                0,
            ),
            "duplicate_percentage": profile.get(
                "duplicate_percentage",
                0,
            ),
            "constant_columns": profile.get(
                "constant_columns",
                [],
            ),
            "id_like_columns": profile.get(
                "id_like_columns",
                [],
            ),
            "outlier_counts": profile.get(
                "outlier_counts",
                {},
            ),
            "outlier_percentages": profile.get(
                "outlier_percentages",
                {},
            ),
        },

        "eda": {
            "numeric_columns": eda.get(
                "numeric_columns",
                [],
            ),
            "categorical_columns": eda.get(
                "categorical_columns",
                [],
            ),
            "numeric_statistics": eda.get(
                "numeric_statistics",
                {},
            ),
            "categorical_statistics": eda.get(
                "categorical_statistics",
                {},
            ),
            "correlation_matrix": eda.get(
                "correlation_matrix",
                {},
            ),
        },

        "automated_findings": findings,

        "target_detection": target_detection,
    }

    if automl_result is not None:
        context["automl"] = automl_result

    return context


def _get_section(
    context: Dict[str, Any],
    section_name: str,
) -> Dict[str, Any]:
    """
    Safely retrieve a dictionary section from the context.
    """

    section = context.get(
        section_name,
        {},
    )

    if isinstance(section, dict):
        return section

    return {}


def _format_percentage(value: Any) -> str:
    """
    Format a percentage safely.
    """

    try:
        return "{:.2f}%".format(
            float(value)
        )
    except (TypeError, ValueError):
        return "0%"


def _generate_executive_summary(
    context: Dict[str, Any],
) -> str:
    """
    Generate the executive summary.
    """

    dataset = _get_section(
        context,
        "dataset",
    )

    quality = _get_section(
        context,
        "data_quality",
    )

    target = _get_section(
        context,
        "target_detection",
    )

    rows = dataset.get(
        "rows",
        0,
    )

    columns = dataset.get(
        "columns",
        0,
    )

    quality_score = quality.get(
        "quality_score",
        0,
    )

    target_column = target.get(
        "recommended_target"
    )

    problem_type = target.get(
        "problem_type",
        "unknown",
    )

    summary = (
        "The dataset contains {} rows and {} columns "
        "with an overall data-quality score of {}/100."
    ).format(
        rows,
        columns,
        quality_score,
    )

    if target_column:
        summary += (
            " The automatically detected target is "
            "'{}', and the problem type is {}."
        ).format(
            target_column,
            problem_type,
        )
    else:
        summary += (
            " No reliable target column was automatically "
            "identified."
        )

    return summary


def _generate_data_quality_insights(
    context: Dict[str, Any],
) -> List[str]:
    """
    Generate insights about dataset quality.
    """

    quality = _get_section(
        context,
        "data_quality",
    )

    insights = []

    quality_score = quality.get(
        "quality_score",
        0,
    )

    total_missing = quality.get(
        "total_missing_values",
        0,
    )

    duplicate_rows = quality.get(
        "duplicate_rows",
        0,
    )

    duplicate_percentage = quality.get(
        "duplicate_percentage",
        0,
    )

    constant_columns = quality.get(
        "constant_columns",
        [],
    )

    id_like_columns = quality.get(
        "id_like_columns",
        [],
    )

    outlier_counts = quality.get(
        "outlier_counts",
        {},
    )

    outlier_percentages = quality.get(
        "outlier_percentages",
        {},
    )

    # Quality score
    if quality_score >= 90:
        insights.append(
            "The dataset has strong overall data quality "
            "with a score of {}/100."
            .format(quality_score)
        )

    elif quality_score >= 70:
        insights.append(
            "The dataset has moderate data quality with "
            "a score of {}/100. Some preprocessing may "
            "be required."
            .format(quality_score)
        )

    else:
        insights.append(
            "The dataset has relatively low data quality "
            "with a score of {}/100. Significant "
            "preprocessing may be required."
            .format(quality_score)
        )

    # Missing values
    if total_missing == 0:
        insights.append(
            "No missing values were detected in the dataset."
        )
    else:
        insights.append(
            "The dataset contains {} missing values. "
            "These should be handled during preprocessing."
            .format(total_missing)
        )

    # Duplicate rows
    if duplicate_rows == 0:
        insights.append(
            "No duplicate rows were detected."
        )
    else:
        insights.append(
            "{} duplicate rows were detected, representing "
            "{} of the dataset."
            .format(
                duplicate_rows,
                _format_percentage(
                    duplicate_percentage
                ),
            )
        )

    # Constant columns
    if constant_columns:
        insights.append(
            "Constant columns were detected: {}. "
            "These columns provide little useful information "
            "for predictive modeling."
            .format(
                ", ".join(
                    str(column)
                    for column in constant_columns
                )
            )
        )

    # ID-like columns
    if id_like_columns:
        insights.append(
            "Potential ID-like or high-cardinality columns "
            "were detected: {}. These should be reviewed "
            "before model training because identifiers may "
            "not provide meaningful predictive information."
            .format(
                ", ".join(
                    str(column)
                    for column in id_like_columns
                )
            )
        )

    # Outliers
    outlier_columns = []

    for column, count in outlier_counts.items():

        if count <= 0:
            continue

        percentage = outlier_percentages.get(
            column,
            0,
        )

        outlier_columns.append(
            "{} ({} outliers, {})".format(
                column,
                count,
                _format_percentage(
                    percentage
                ),
            )
        )

    if outlier_columns:
        insights.append(
            "Potential numeric outliers were detected in: {}. "
            "These values should be reviewed before modeling."
            .format(
                ", ".join(outlier_columns)
            )
        )
    else:
        insights.append(
            "No potential numeric outliers were detected "
            "using the current IQR-based analysis."
        )

    return insights


def _generate_pattern_insights(
    context: Dict[str, Any],
) -> List[str]:
    """
    Generate insights from numeric and categorical analysis.
    """

    eda = _get_section(
        context,
        "eda",
    )

    insights = []

    numeric_statistics = eda.get(
        "numeric_statistics",
        {},
    )

    categorical_statistics = eda.get(
        "categorical_statistics",
        {},
    )

    # Numeric patterns
    for column, statistics in numeric_statistics.items():

        mean = statistics.get(
            "mean"
        )

        median = statistics.get(
            "median"
        )

        minimum = statistics.get(
            "min"
        )

        maximum = statistics.get(
            "max"
        )

        if (
            mean is None
            or median is None
        ):
            continue

        if mean > median:
            insights.append(
                "{} has a mean ({}) above its median ({}), "
                "which may indicate that higher values are "
                "pulling the average upward."
                .format(
                    column,
                    mean,
                    median,
                )
            )

        elif mean < median:
            insights.append(
                "{} has a mean ({}) below its median ({}), "
                "indicating that lower values may be "
                "pulling the average downward."
                .format(
                    column,
                    mean,
                    median,
                )
            )

        if (
            minimum is not None
            and maximum is not None
        ):
            insights.append(
                "{} ranges from {} to {}."
                .format(
                    column,
                    minimum,
                    maximum,
                )
            )

    # Categorical patterns
    for column, statistics in categorical_statistics.items():

        top_values = statistics.get(
            "top_values",
            [],
        )

        if not top_values:
            continue

        top_value = top_values[0]

        value = top_value.get(
            "value"
        )

        count = top_value.get(
            "count",
            0,
        )

        insights.append(
            "The most frequent value in {} is '{}' "
            "with {} records."
            .format(
                column,
                value,
                count,
            )
        )

    return insights


def _generate_correlation_insights(
    context: Dict[str, Any],
) -> List[str]:
    """
    Generate insights from the correlation matrix.

    Correlation is described as an association,
    never as proof of causation.
    """

    eda = _get_section(
        context,
        "eda",
    )

    correlation_matrix = eda.get(
        "correlation_matrix",
        {},
    )

    columns = correlation_matrix.get(
        "columns",
        [],
    )

    values = correlation_matrix.get(
        "values",
        [],
    )

    insights = []

    if not columns or not values:
        return insights

    strong_positive = []
    strong_negative = []

    for i in range(
        len(columns)
    ):

        for j in range(
            i + 1,
            len(columns),
        ):

            try:
                correlation = float(
                    values[i][j]
                )
            except (
                TypeError,
                ValueError,
                IndexError,
            ):
                continue

            column_a = columns[i]
            column_b = columns[j]

            if correlation >= 0.8:
                strong_positive.append(
                    "{} and {} ({:.2f})".format(
                        column_a,
                        column_b,
                        correlation,
                    )
                )

            elif correlation <= -0.8:
                strong_negative.append(
                    "{} and {} ({:.2f})".format(
                        column_a,
                        column_b,
                        correlation,
                    )
                )

    if strong_positive:
        insights.append(
            "Strong positive associations were detected "
            "between: {}. Correlation indicates association "
            "and does not by itself establish causation."
            .format(
                ", ".join(
                    strong_positive
                )
            )
        )

    if strong_negative:
        insights.append(
            "Strong negative associations were detected "
            "between: {}. Correlation indicates association "
            "and does not by itself establish causation."
            .format(
                ", ".join(
                    strong_negative
                )
            )
        )

    if not strong_positive and not strong_negative:
        insights.append(
            "No very strong linear correlations "
            "(absolute correlation of 0.80 or higher) "
            "were detected."
        )

    return insights


def _generate_ml_insights(
    context: Dict[str, Any],
) -> List[str]:
    """
    Generate insights from target detection and
    AutoML results when available.
    """

    target = _get_section(
        context,
        "target_detection",
    )

    automl = _get_section(
        context,
        "automl",
    )

    insights = []

    target_column = target.get(
        "recommended_target"
    )

    problem_type = target.get(
        "problem_type",
        "unknown",
    )

    confidence = target.get(
        "confidence",
        "low",
    )

    if target_column:
        insights.append(
            "The automatically recommended target is '{}' "
            "with a {} problem type and {} confidence."
            .format(
                target_column,
                problem_type,
                confidence,
            )
        )

    results = automl.get(
        "results",
        [],
    )

    if results:

        best_model = results[0]

        model_name = best_model.get(
            "model",
            "Unknown model",
        )

        f1_score = best_model.get(
            "f1_score"
        )

        accuracy = best_model.get(
            "accuracy"
        )

        if f1_score is not None:
            insights.append(
                "Among the tested models, {} achieved "
                "the highest F1 score of {}."
                .format(
                    model_name,
                    f1_score,
                )
            )

        if accuracy is not None:
            insights.append(
                "{} achieved an accuracy of {} "
                "on the held-out test set."
                .format(
                    model_name,
                    accuracy,
                )
            )

        insights.append(
            "Model performance should be evaluated using "
            "multiple metrics rather than relying on a "
            "single score."
        )

    else:
        insights.append(
            "No trained model results are currently available. "
            "Run AutoML after selecting a target to compare "
            "candidate models."
        )

    return insights


def _generate_recommendations(
    context: Dict[str, Any],
) -> List[str]:
    """
    Generate practical next-step recommendations.
    """

    quality = _get_section(
        context,
        "data_quality",
    )

    target = _get_section(
        context,
        "target_detection",
    )

    recommendations = []

    total_missing = quality.get(
        "total_missing_values",
        0,
    )

    duplicate_rows = quality.get(
        "duplicate_rows",
        0,
    )

    constant_columns = quality.get(
        "constant_columns",
        [],
    )

    id_like_columns = quality.get(
        "id_like_columns",
        [],
    )

    outlier_counts = quality.get(
        "outlier_counts",
        {},
    )

    target_column = target.get(
        "recommended_target"
    )

    if total_missing > 0:
        recommendations.append(
            "Handle missing values using an appropriate "
            "imputation strategy before model training."
        )

    if duplicate_rows > 0:
        recommendations.append(
            "Review duplicate rows and determine whether "
            "they represent repeated observations or "
            "data-quality issues."
        )

    if constant_columns:
        recommendations.append(
            "Consider removing constant columns because "
            "they provide no variation for predictive models."
        )

    if id_like_columns:
        recommendations.append(
            "Review high-cardinality or ID-like columns "
            "and exclude identifiers when they do not "
            "represent meaningful predictive information."
        )

    if any(
        count > 0
        for count in outlier_counts.values()
    ):
        recommendations.append(
            "Review detected outliers and determine whether "
            "they are genuine observations or data-entry errors "
            "before deciding how to handle them."
        )

    if target_column:
        recommendations.append(
            "Use '{}' as the starting target candidate, "
            "but verify that it matches the actual business "
            "question before training models."
            .format(
                target_column
            )
        )
    else:
        recommendations.append(
            "Manually select a target column before starting "
            "machine-learning analysis."
        )

    if not recommendations:
        recommendations.append(
            "The dataset appears suitable for further "
            "exploratory analysis and machine-learning "
            "experimentation."
        )

    return recommendations


def generate_ai_insights(
    ai_context: Dict[str, Any],
) -> str:
    """
    Generate human-readable AI-style insights without
    requiring an external LLM or paid API.

    This is the FREE InsightForgeAI fallback engine.

    Python remains responsible for all numerical analysis.
    This function only converts those results into readable
    explanations.
    """

    executive_summary = _generate_executive_summary(
        ai_context
    )

    data_quality_insights = (
        _generate_data_quality_insights(
            ai_context
        )
    )

    pattern_insights = (
        _generate_pattern_insights(
            ai_context
        )
    )

    correlation_insights = (
        _generate_correlation_insights(
            ai_context
        )
    )

    ml_insights = (
        _generate_ml_insights(
            ai_context
        )
    )

    recommendations = (
        _generate_recommendations(
            ai_context
        )
    )

    sections = []

    # --------------------------------------------------
    # 1. EXECUTIVE SUMMARY
    # --------------------------------------------------

    sections.append(
        "## 1. Executive Summary\n\n"
        + executive_summary
    )

    # --------------------------------------------------
    # 2. DATA QUALITY INSIGHTS
    # --------------------------------------------------

    quality_text = "\n".join(
        "- " + insight
        for insight in data_quality_insights
    )

    sections.append(
        "## 2. Data Quality Insights\n\n"
        + quality_text
    )

    # --------------------------------------------------
    # 3. IMPORTANT DATA PATTERNS
    # --------------------------------------------------

    if pattern_insights:
        pattern_text = "\n".join(
            "- " + insight
            for insight in pattern_insights
        )
    else:
        pattern_text = (
            "No additional numeric or categorical "
            "patterns were identified."
        )

    sections.append(
        "## 3. Important Data Patterns\n\n"
        + pattern_text
    )

    # --------------------------------------------------
    # 4. RELATIONSHIPS BETWEEN VARIABLES
    # --------------------------------------------------

    correlation_text = "\n".join(
        "- " + insight
        for insight in correlation_insights
    )

    if not correlation_text:
        correlation_text = (
            "No correlation information was available."
        )

    sections.append(
        "## 4. Relationships Between Variables\n\n"
        + correlation_text
    )

    # --------------------------------------------------
    # 5. MACHINE LEARNING INSIGHTS
    # --------------------------------------------------

    ml_text = "\n".join(
        "- " + insight
        for insight in ml_insights
    )

    sections.append(
        "## 5. Machine Learning Insights\n\n"
        + ml_text
    )

    # --------------------------------------------------
    # 6. RECOMMENDED NEXT STEPS
    # --------------------------------------------------

    recommendation_text = "\n".join(
        "- " + recommendation
        for recommendation in recommendations
    )

    sections.append(
        "## 6. Recommended Next Steps\n\n"
        + recommendation_text
    )

    return "\n\n".join(
        sections
    )