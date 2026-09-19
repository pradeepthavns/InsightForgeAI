from pathlib import Path

import pandas as pd


def load_dataset(file_path: Path) -> pd.DataFrame:
    extension = file_path.suffix.lower()

    if extension == ".csv":
        return pd.read_csv(file_path)

    if extension == ".xlsx":
        return pd.read_excel(file_path)

    raise ValueError("Unsupported file type")


def get_basic_info(df: pd.DataFrame) -> dict:
    return {
        "rows": int(df.shape[0]),
        "columns": int(df.shape[1]),
        "column_names": df.columns.tolist(),
        "data_types": {
            column: str(dtype)
            for column, dtype in df.dtypes.items()
        },
    }


def get_data_quality_info(df: pd.DataFrame) -> dict:
    total_rows = len(df)

    # --------------------------------------------------
    # 1. Missing values
    # --------------------------------------------------

    missing_values = df.isnull().sum()

    if total_rows > 0:
        missing_percentages = (
            missing_values / total_rows * 100
        )
    else:
        missing_percentages = missing_values

    # --------------------------------------------------
    # 2. Duplicate rows
    # --------------------------------------------------

    duplicate_rows = int(df.duplicated().sum())

    if total_rows > 0:
        duplicate_percentage = (
            duplicate_rows / total_rows * 100
        )
    else:
        duplicate_percentage = 0

    # --------------------------------------------------
    # 3. Constant columns
    # --------------------------------------------------

    constant_columns = [
        column
        for column in df.columns
        if df[column].nunique(dropna=False) <= 1
    ]

    # --------------------------------------------------
    # 4. ID-like / high-cardinality columns
    # --------------------------------------------------

    id_like_columns = [
        column
        for column in df.columns
        if (
            total_rows > 0
            and df[column].nunique(dropna=True) / total_rows >= 0.9
            and column not in constant_columns
        )
    ]

    # --------------------------------------------------
    # 5. Numeric outliers using IQR
    # --------------------------------------------------

    outlier_counts = {}
    outlier_percentages = {}

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns

    for column in numeric_columns:
        series = df[column].dropna()

        if len(series) < 4:
            outlier_counts[column] = 0
            outlier_percentages[column] = 0.0
            continue

        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)

        iqr = q3 - q1

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        outliers = series[
            (series < lower_bound)
            | (series > upper_bound)
        ]

        count = int(outliers.count())

        outlier_counts[column] = count

        if total_rows > 0:
            outlier_percentages[column] = round(
                float(count / total_rows * 100),
                2,
            )
        else:
            outlier_percentages[column] = 0.0

    # --------------------------------------------------
    # 6. Overall data-quality score
    # --------------------------------------------------

    score = 100.0

    # Penalize missing values
    if total_rows > 0 and total_rows * len(df.columns) > 0:
        total_cells = total_rows * len(df.columns)

        missing_percentage_overall = (
            missing_values.sum()
            / total_cells
            * 100
        )

        score -= missing_percentage_overall * 0.5

    # Penalize duplicate rows
    score -= duplicate_percentage * 0.25

    # Penalize constant columns
    if len(df.columns) > 0:
        constant_percentage = (
            len(constant_columns)
            / len(df.columns)
            * 100
        )

        score -= constant_percentage * 0.5

    # Penalize outliers
    if outlier_percentages:
        average_outlier_percentage = (
            sum(outlier_percentages.values())
            / len(outlier_percentages)
        )

        score -= average_outlier_percentage * 0.25

    score = max(0.0, min(100.0, score))

    # --------------------------------------------------
    # Return complete data-quality information
    # --------------------------------------------------

    return {
        "missing_values": {
            column: int(count)
            for column, count in missing_values.items()
        },

        "missing_percentages": {
            column: round(float(percentage), 2)
            for column, percentage in missing_percentages.items()
        },

        "total_missing_values": int(
            missing_values.sum()
        ),

        "duplicate_rows": duplicate_rows,

        "duplicate_percentage": round(
            float(duplicate_percentage),
            2,
        ),

        "constant_columns": constant_columns,

        "id_like_columns": id_like_columns,

        "outlier_counts": outlier_counts,

        "outlier_percentages": outlier_percentages,

        "data_quality_score": round(
            score,
            2,
        ),
    }


def get_column_statistics(df: pd.DataFrame) -> dict:
    return {
        "unique_values": {
            column: int(df[column].nunique())
            for column in df.columns
        },

        "memory_usage_bytes": int(
            df.memory_usage(deep=True).sum()
        ),
    }


def get_dataset_profile(df: pd.DataFrame) -> dict:
    basic_info = get_basic_info(df)
    quality_info = get_data_quality_info(df)
    column_statistics = get_column_statistics(df)

    return {
        **basic_info,
        **quality_info,
        **column_statistics,
    }