# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "bedrock-ge==0.3.2",
#     "mapclassify==2.10.0",
#     "marimo",
#     "matplotlib==3.10.6",
#     "pyproj==3.7.2",
# ]
# ///

import marimo

__generated_with = "0.15.2"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    from pyproj import CRS
    from pathlib import Path
    return CRS, Path, mo


@app.cell
def _():
    import json
    return (json,)


@app.cell
def _(ags_files, mo):
    mo.md(
        f"""
    # Data Transformation for CesiumJS 3d Webmap Using `bedrock-ge`

    This notebook demonstrates the data processing step for creating an interactive web map from AGS files.

    **What we'll do:** Transform AGS files into web-friendly GeoJSON format using the `bedrock-ge` Python library.

    **You'll learn:** How to convert specialized geotechnical data into formats that web maps can display.

    We'll work with real Ground Investigation (GI) data from the Kai Tak neighborhood in Hong Kong.

    ## Making GI Data Accessible

    GI data typically lives in specialized formats that require specialized software to read and view. Instead of sharing folders of technical files, we'll create data that works in any web browser.

    Here's what raw AGS data looks like — not very accessible for stakeholders:

    ```
    {"\n".join(ags_files[0].read_text().splitlines()[0:20])}
    ```

    ## GI Data Webmap

    We'll transform this technical data into:
    - **GeoJSON** for map locations (readable by web mapping libraries)  
    - **JSON** for test results (readable by charting libraries)

    This lets us build interactive maps where stakeholders can click on investigation locations to see detailed results, without needing specialized software.
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
    return ags_to_brgi_db_mapping, create_brgi_geodb, map_to_brgi_db, merge_dbs


@app.cell
def _(CRS):
    projected_crs = CRS("EPSG:2326")  # Hong Kong 1980 Grid System
    vertical_crs = CRS("EPSG:5738")   # Hong Kong Principle Datum
    return projected_crs, vertical_crs


@app.cell
def _(mo):
    mo.md(r"""Cesium only supports WGS84 Ellipsoidal height ([EPSG:4979](https://epsg.io/4979)) """)
    return


@app.cell
def _(CRS):
    cesium_crs = CRS("EPSG:4979")
    return (cesium_crs,)


@app.cell
def _(Path):
    folder_path = Path("../../data/kaitak_ags3")
    ags_files = list(folder_path.rglob("*AGS")) + list(folder_path.rglob("*ags"))
    return (ags_files,)


@app.cell
def _(ags_files):
    ags_files
    return


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
def _():
    return


@app.cell
def _(ags_file_brgi_dbs, merge_dbs):
    merged_brgi_db = merge_dbs(ags_file_brgi_dbs)
    return (merged_brgi_db,)


@app.cell
def _(merged_brgi_db):
    merged_brgi_db
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 2: Make the Data Geospatial

    Now we'll transform our merged database into geospatial data. `bedrock-ge` creates 3D geospatial geometries for boreholes, specifically vertical lines representing the full depth of each investigation.

    This step automatically converts coordinates and creates the geometric representations needed for mapping.
    """
    )
    return


@app.cell
def _(create_brgi_geodb, merged_brgi_db):
    geodb = create_brgi_geodb(merged_brgi_db)
    return (geodb,)


@app.cell
def _(mo):
    mo.md(r"""## Location Table""")
    return


@app.cell
def _(geodb):
    geodb.LonLatHeight.explore()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 3: Add Data to Display

    Your map will display key information about each borehole. Let's select the columns from the `Location` DataFrame we want to show:

    - The identifier of the borehole `HOLE_ID`
    - The type of borehole `HOLE_TYPE`  
    - The start & end date of drilling `HOLE_STAR` & `HOLE_ENDD`
    - Remarks `HOLE_REM`
    """
    )
    return


@app.cell
def _(geodb):
    location_columns = ["location_uid", "HOLE_ID", "HOLE_TYPE", "HOLE_STAR", "HOLE_ENDD", "HOLE_REM", "geometry"]
    location_geodf = geodb.Location[location_columns]
    location_geodf
    return (location_geodf,)


@app.cell
def _(mo):
    mo.md(r"""Let's look at what kind of hole types are inside:""")
    return


@app.cell
def _(geodb):
    list(geodb.Location["HOLE_TYPE"].unique())
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ### Abbreviations

    Hole types are abbreviations. The meaning of the abbreviations are in the `ABBR` group in the AGS files. `bedrock-ge` puts this group in `Other` of the geospatial database. We need the ones with `ABBR_HDNG` 
    """
    )
    return


@app.cell
def _(geodb):
    abbr = geodb.Other["ABBR"]
    abbr
    return (abbr,)


@app.cell
def _():
    return


@app.cell
def _(abbr):
    geology_legend_df = abbr[abbr["ABBR_HDNG"] == "GEOL_LEG"]
    return (geology_legend_df,)


@app.cell
def _(geology_legend_df, json):
    geology_abbr_legend = geology_legend_df[['ABBR_CODE', 'ABBR_DESC']].drop_duplicates()
    # geology_abbr_legend.to_json("../webmap/geology_legend.json")
    geology_legend_dict = geology_abbr_legend.set_index('ABBR_CODE')['ABBR_DESC'].to_dict()

    with open('../webmap/geology_legend.json', 'w') as f:
        json.dump(geology_legend_dict, f, indent=2)
    return (geology_legend_dict,)


@app.cell
def _(geology_legend_dict):
    geology_legend_dict
    return


@app.cell
def _(cesium_crs, location_geodf, remove_crs):
    locations_geojson = remove_crs(location_geodf.to_crs(cesium_crs).to_json())

    with open("../webmap/locations.geojson", "w") as file:
        file.write(locations_geojson)

    print(f"✅ Exported {len(location_geodf)} locations to locations.geojson")
    return


@app.cell
def _(geodb):
    geodb.InSituTests["GEOL"]
    return


@app.cell
def _(cesium_crs, geodb, remove_crs):
    geol_df = geodb.InSituTests["GEOL"].to_crs(cesium_crs)

    geol_geojson = remove_crs(geol_df.to_json())

    with open("../webmap/geol.geojson", "w") as geol_file:
        geol_file.write(geol_geojson)

    print(f"Exported {len(geol_df)} locations to locations.geojson")
    return


@app.cell
def _(geodb):
    list(geodb.InSituTests.keys())
    return


@app.cell
def _(mo):
    mo.md(r"""### Frac""")
    return


@app.cell
def _(geodb):
    geodb.InSituTests["FRAC"]
    return


@app.cell
def _(cesium_crs, geodb, remove_crs):
    fracture_spacing_df = geodb.InSituTests["FRAC"].to_crs(cesium_crs)

    fracture_spacing_geojson = remove_crs(fracture_spacing_df.to_json())

    with open("../webmap/fracture.geojson", "w") as fracture_spacing_file:
        fracture_spacing_file.write(fracture_spacing_geojson)
    return (fracture_spacing_df,)


@app.cell
def _(mo):
    mo.md(r"""### Core""")
    return


@app.cell
def _(cesium_crs, geodb, remove_crs):
    core_df = geodb.InSituTests["CORE"].to_crs(cesium_crs)

    core_geojson = remove_crs(core_df.to_json())

    with open("../webmap/core.geojson", "w") as core_file:
        core_file.write(core_geojson)
    return (core_df,)


@app.cell
def _(core_df):
    core_df["CORE_RQD"]
    return


@app.cell
def _(geodb):
    geodb.InSituTests["DETL"]
    return


@app.cell
def _(fracture_spacing_df):
    list(fracture_spacing_df["FRAC_FI"].unique())
    return


@app.cell
def _(fracture_spacing_df):
    len(fracture_spacing_df["location_uid"].unique())
    return


@app.cell
def _(cesium_crs, geodb, remove_crs):
    weathering_grade_df = geodb.InSituTests["WETH"].to_crs(cesium_crs)

    weathering_grade_geojson = remove_crs(weathering_grade_df.to_json())

    with open("../webmap/weathering.geojson", "w") as weathering_grade_file:
        weathering_grade_file.write(weathering_grade_geojson)
    return (weathering_grade_df,)


@app.cell
def _(weathering_grade_df):
    list(weathering_grade_df["WETH_GRAD"].unique())
    return


@app.cell
def _(json):
    def remove_crs(geojson_data):
        geojson = json.loads(geojson_data)
        if 'crs' in geojson_data:
            del geojson['crs']
            print("Removed CRS")
            return json.dumps(geojson)
        print("No CRS")
        return geojson_data
    return (remove_crs,)


if __name__ == "__main__":
    app.run()
