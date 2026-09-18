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
    missing_values = df.isnull().sum()
    duplicate_rows = df.duplicated().sum()

    return {
        "missing_values": {
            column: int(count)
            for column, count in missing_values.items()
        },
        "total_missing_values": int(missing_values.sum()),
        "duplicate_rows": int(duplicate_rows),
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