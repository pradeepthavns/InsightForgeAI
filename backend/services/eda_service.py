import pandas as pd


def get_numeric_statistics(df: pd.DataFrame) -> dict:
    """
    Generate descriptive statistics for numeric columns.
    """

    numeric_df = df.select_dtypes(include="number")

    statistics = {}

    for column in numeric_df.columns:
        series = numeric_df[column].dropna()

        if len(series) == 0:
            continue

        statistics[column] = {
            "count": int(series.count()),
            "mean": round(float(series.mean()), 2),
            "median": round(float(series.median()), 2),
            "std": round(float(series.std()), 2),
            "min": round(float(series.min()), 2),
            "max": round(float(series.max()), 2),
            "q1": round(float(series.quantile(0.25)), 2),
            "q3": round(float(series.quantile(0.75)), 2),
        }

    return statistics


def get_categorical_statistics(df: pd.DataFrame) -> dict:
    """
    Generate frequency information for categorical columns.
    """

    categorical_df = df.select_dtypes(
        include=["object", "category", "bool"]
    )

    statistics = {}

    for column in categorical_df.columns:

        value_counts = (
            categorical_df[column]
            .value_counts(dropna=False)
            .head(10)
        )

        values = []

        for value, count in value_counts.items():

            if pd.isna(value):
                value = "Missing"

            values.append({
                "value": str(value),
                "count": int(count),
            })

        statistics[column] = {
            "unique_values": int(
                categorical_df[column].nunique(dropna=True)
            ),
            "top_values": values,
        }

    return statistics


def get_correlation_matrix(df: pd.DataFrame) -> dict:
    """
    Calculate Pearson correlation between numeric columns.
    """

    numeric_df = df.select_dtypes(include="number")

    if numeric_df.shape[1] < 2:
        return {
            "columns": [],
            "values": [],
        }

    correlation = numeric_df.corr()

    return {
        "columns": correlation.columns.tolist(),
        "values": correlation.round(3).fillna(0).values.tolist(),
    }


def get_eda_summary(df: pd.DataFrame) -> dict:
    """
    Generate the complete automated EDA summary.
    """

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    categorical_columns = df.select_dtypes(
        include=["object", "category", "bool"]
    ).columns.tolist()

    return {
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "numeric_statistics": get_numeric_statistics(df),
        "categorical_statistics": get_categorical_statistics(df),
        "correlation_matrix": get_correlation_matrix(df),
    }