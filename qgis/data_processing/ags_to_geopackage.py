import marimo

__generated_with = "0.15.0"
app = marimo.App(width="medium")


@app.cell
def _(ags_files, mo):
    mo.md(
        f"""
    # Data Transformation With `bedrock-ge`

    This notebook demonstrates the data processing step for creating an interactive web map from geotechnical AGS files.

    **What we'll do:** Transform AGS files into web-friendly GeoJSON format using the `bedrock-ge` Python library.

    **You'll learn:** How to convert specialized geotechnical data into formats that web maps can display.

    We'll work with real Ground Investigation (GI) data from the Kai Tak neighborhood in Hong Kong.

    ## Making GI Data Accessible

    GI data typically lives in AGS text files that require specialized software to read. Instead of sharing folders of technical files, we'll create data that works in any web browser.

    Here's what raw AGS data looks like - not very accessible for stakeholders:

    ```
    {"\n".join(ags_files[0].read_text().splitlines()[0:20])}
    ```
    """
    )
    return


@app.cell
def _():
    from bedrock_ge.gi.ags import ags_to_brgi_db_mapping
    from bedrock_ge.gi.db_operations import merge_dbs
    from bedrock_ge.gi.geospatial import create_brgi_geodb
    from bedrock_ge.gi.io_utils import geodf_to_df
    from bedrock_ge.gi.mapper import map_to_brgi_db
    from bedrock_ge.gi.write import write_brgi_db_to_file
    from pyproj import CRS
    from pathlib import Path
    return (
        CRS,
        Path,
        ags_to_brgi_db_mapping,
        create_brgi_geodb,
        map_to_brgi_db,
        merge_dbs,
        write_brgi_db_to_file,
    )


@app.cell
def _(CRS):
    projected_crs = CRS("EPSG:2326")  # Hong Kong 1980 Grid System
    vertical_crs = CRS("EPSG:5738")   # Hong Kong Principle Datum
    return projected_crs, vertical_crs


@app.cell
def _(Path):
    folder_path = Path("../../hk_kai_tak_ags_files")
    ags_files = list(folder_path.glob("*AGS")) + list(folder_path.glob("*ags"))
    return (ags_files,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 1: Read AGS Files Using Bedrock

    First, we'll convert each AGS file to a standardized database format. 

    For this transformation, you need to know your data's coordinate reference system (CRS):
    - **Horizontal CRS**: Hong Kong 1980 Grid System (EPSG:2326) 
    - **Vertical CRS**: Hong Kong Principle Datum (EPSG:5738)

    Each AGS file gets converted to a single `BedrockGIDatabase` object that standardizes the various AGS groups and tables.
    """
    )
    return


@app.cell
def _(
    ags_files,
    ags_to_brgi_db_mapping,
    map_to_brgi_db,
    projected_crs,
    vertical_crs,
):
    ags_file_brgi_dbs = []

    for file_path in ags_files:
        print(f"[Processing {file_path.name}]")
        brgi_mapping = ags_to_brgi_db_mapping(file_path, projected_crs, vertical_crs)
        brgi_db = map_to_brgi_db(brgi_mapping)
        ags_file_brgi_dbs.append(brgi_db)
    return (ags_file_brgi_dbs,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""Now we'll merge all the individual databases into a single combined database. This gives us a unified view of all ground investigation data across the project.""")
    return


@app.cell
def _(ags_file_brgi_dbs, merge_dbs):
    merged_brgi_db = merge_dbs(ags_file_brgi_dbs)
    return (merged_brgi_db,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 2: Make the Data Geospatial

    Now we'll transform our merged database into geospatial data. `bedrock-ge` creates 3D geospatial geometries for boreholes - specifically vertical lines representing the full depth of each investigation.

    This step automatically converts coordinates and creates the geometric representations needed for mapping.
    """
    )
    return


@app.cell
def _(create_brgi_geodb, merged_brgi_db):
    geodb = create_brgi_geodb(merged_brgi_db)
    return (geodb,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""Let's look at what kind of hole types are inside:""")
    return


@app.cell
def _(geodb):
    geodb.Location["HOLE_TYPE"].unique()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## `geodb.LonLatHeight` vs `geodb.Location`

    Web maps don't display vertical lines well. Therefore, `create_brgi_geodb` also creates a `LonLatHeight` table which contains points of your GI locations at ground level in <abbr title="World Geodetic System 1984">WGS84</abbr> coordinates (Longitude, Latitude, Elevation).

    This gives us point locations that web mapping libraries can easily display and style.
    """
    )
    return


@app.cell
def _(geodb):
    geodb.Location
    return


@app.cell
def _(geodb):
    geodb.LonLatHeight.explore()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 3: Export to GeoPackage

    Now we'll export the locations table to GeoPackage format for web display.
    """
    )
    return


@app.cell
def _(geodb, write_brgi_db_to_file):
    write_brgi_db_to_file(geodb, "combined_gi_data.gpkg", driver="GPKG")
    return


@app.cell
def _():
    import marimo as mo
    return (mo,)


if __name__ == "__main__":
    app.run()
