import pandas as pd
from typing import List, Dict


def generate_findings(
    df: pd.DataFrame,
    profile: dict,
    eda: dict,
) -> List[Dict]:
    """
    Generate automated, rule-based findings from the dataset.
    """

    findings = []

    # ---------------------------------------------------------
    # 1. MISSING VALUES
    # ---------------------------------------------------------

    missing_percentages = profile.get(
        "missing_percentages",
        {},
    )

    for column, percentage in missing_percentages.items():

        if percentage >= 20:
            findings.append({
                "type": "critical",
                "title": "High Missing Values",
                "message": (
                    f"{column} contains {percentage}% "
                    "missing values. This column may require "
                    "careful preprocessing."
                ),
            })

        elif percentage > 0:
            findings.append({
                "type": "warning",
                "title": "Missing Values Detected",
                "message": (
                    f"{column} contains {percentage}% "
                    "missing values."
                ),
            })

    # ---------------------------------------------------------
    # 2. DUPLICATE ROWS
    # ---------------------------------------------------------

    duplicate_percentage = profile.get(
        "duplicate_percentage",
        0,
    )

    if duplicate_percentage >= 10:

        findings.append({
            "type": "critical",
            "title": "High Duplicate Rate",
            "message": (
                f"{duplicate_percentage}% of rows are duplicates. "
                "Duplicate records may affect analysis and model training."
            ),
        })

    elif duplicate_percentage > 0:

        findings.append({
            "type": "warning",
            "title": "Duplicate Rows Detected",
            "message": (
                f"{duplicate_percentage}% of rows are duplicates."
            ),
        })

    # ---------------------------------------------------------
    # 3. CONSTANT COLUMNS
    # ---------------------------------------------------------

    constant_columns = profile.get(
        "constant_columns",
        [],
    )

    for column in constant_columns:

        findings.append({
            "type": "warning",
            "title": "Constant Column Detected",
            "message": (
                f"{column} contains only one unique value "
                "and provides little useful information for modeling."
            ),
        })

    # ---------------------------------------------------------
    # 4. ID-LIKE COLUMNS
    # ---------------------------------------------------------

    id_like_columns = profile.get(
        "id_like_columns",
        [],
    )

    for column in id_like_columns:

        findings.append({
            "type": "info",
            "title": "Potential ID-like Column",
            "message": (
                f"{column} has very high cardinality and may "
                "represent an identifier rather than a useful "
                "predictive feature."
            ),
        })

    # ---------------------------------------------------------
    # 5. OUTLIERS
    # ---------------------------------------------------------

    outlier_counts = profile.get(
        "outlier_counts",
        {},
    )

    outlier_percentages = profile.get(
        "outlier_percentages",
        {},
    )

    for column, count in outlier_counts.items():

        percentage = outlier_percentages.get(
            column,
            0,
        )

        if count == 0:
            continue

        if percentage >= 10:

            findings.append({
                "type": "critical",
                "title": "High Outlier Rate",
                "message": (
                    f"{column} contains {count} potential outliers "
                    f"({percentage}% of the dataset)."
                ),
            })

        else:

            findings.append({
                "type": "warning",
                "title": "Potential Outliers Detected",
                "message": (
                    f"{column} contains {count} potential outliers "
                    f"({percentage}% of the dataset)."
                ),
            })

    # ---------------------------------------------------------
    # 6. STRONG CORRELATIONS
    # ---------------------------------------------------------

    correlation_matrix = eda.get(
        "correlation_matrix",
        {},
    )

    correlation_columns = correlation_matrix.get(
        "columns",
        [],
    )

    correlation_values = correlation_matrix.get(
        "values",
        [],
    )

    for i in range(len(correlation_columns)):

        for j in range(
            i + 1,
            len(correlation_columns),
        ):

            correlation = correlation_values[i][j]

            column_a = correlation_columns[i]
            column_b = correlation_columns[j]

            # Strong positive correlation
            if correlation >= 0.8:

                findings.append({
                    "type": "positive",
                    "title": "Strong Positive Correlation",
                    "message": (
                        f"{column_a} and {column_b} have a strong "
                        f"positive correlation ({correlation:.2f})."
                    ),
                })

            # Strong negative correlation
            elif correlation <= -0.8:

                findings.append({
                    "type": "negative",
                    "title": "Strong Negative Correlation",
                    "message": (
                        f"{column_a} and {column_b} have a strong "
                        f"negative correlation ({correlation:.2f})."
                    ),
                })

    # ---------------------------------------------------------
    # 7. CATEGORICAL IMBALANCE
    # ---------------------------------------------------------

    categorical_statistics = eda.get(
        "categorical_statistics",
        {},
    )

    total_rows = len(df)

    if total_rows > 0:

        for column, statistics in categorical_statistics.items():

            top_values = statistics.get(
                "top_values",
                [],
            )

            if len(top_values) < 2:
                continue

            first_count = top_values[0]["count"]

            first_percentage = (
                first_count / total_rows * 100
            )

            if first_percentage >= 90:

                findings.append({
                    "type": "warning",
                    "title": "Highly Imbalanced Category",
                    "message": (
                        f"{column} is dominated by one category "
                        f"({first_percentage:.1f}% of records)."
                    ),
                })

    # ---------------------------------------------------------
    # 8. OVERALL DATA QUALITY
    # ---------------------------------------------------------

    quality_score = profile.get(
        "data_quality_score",
        100,
    )

    if quality_score >= 90:

        findings.append({
            "type": "positive",
            "title": "Good Data Quality",
            "message": (
                f"The dataset has an overall data quality score "
                f"of {quality_score}/100."
            ),
        })

    elif quality_score >= 70:

        findings.append({
            "type": "warning",
            "title": "Moderate Data Quality",
            "message": (
                f"The dataset has a data quality score "
                f"of {quality_score}/100. "
                "Some preprocessing may be required."
            ),
        })

    else:

        findings.append({
            "type": "critical",
            "title": "Low Data Quality",
            "message": (
                f"The dataset has a data quality score "
                f"of {quality_score}/100. "
                "Significant preprocessing may be required."
            ),
        })

    # ---------------------------------------------------------
    # RETURN ALL FINDINGS
    # ---------------------------------------------------------

    return findings