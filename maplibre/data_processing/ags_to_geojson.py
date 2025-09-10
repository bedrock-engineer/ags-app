import marimo

__generated_with = "0.14.17"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    from pyproj import CRS
    from pathlib import Path
    return CRS, Path, mo


@app.cell
def _(ags_files, mo):
    mo.md(
        f"""
    # Data Transformation for Webmap Using `bedrock-ge`

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
    return (
        ags_to_brgi_db_mapping,
        create_brgi_geodb,
        geodf_to_df,
        map_to_brgi_db,
        merge_dbs,
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

    Now we'll transform our merged database into geospatial data. `bedrock-ge` creates 3D geospatial geometries for boreholes, specifically vertical lines representing the full depth of each investigation.

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


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 3: Add Data to Display

    Your map will display key information about each borehole. Let's select the columns we want to show:

    - The identifier of the borehole `HOLE_ID`
    - The type of borehole `HOLE_TYPE`  
    - The start & end date of drilling `HOLE_STAR` & `HOLE_ENDD`
    - Remarks `HOLE_REM`
    """
    )
    return


@app.cell
def _(geodb):
    merge_key = "location_uid"

    location_columns = [merge_key, "HOLE_ID", "HOLE_TYPE", "HOLE_STAR", "HOLE_ENDD", "HOLE_REM"]
    location_df = geodb.Location[location_columns]
    return location_df, merge_key


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    Now we'll merge these columns with the `geodb.LonLatHeight` table using the unique identifier `"location_uid"`.

    This joins the coordinate data with the borehole details. The `how="left"` ensures we keep all locations even if some don't have complete data. We drop the separate longitude/latitude columns since the geometry column already contains this information.
    """
    )
    return


@app.cell
def _(geodb, location_df, merge_key):
    locations_webmap_df = geodb.LonLatHeight.merge(location_df, on=merge_key, how="left").drop(columns=["longitude", "latitude"]) # already in geometry
    return (locations_webmap_df,)


@app.cell
def _(locations_webmap_df):
    locations_geojson = locations_webmap_df.to_json()

    with open("../webmap/locations.geojson", "w") as file:
        file.write(locations_geojson)

    print(f"✅ Exported {len(locations_webmap_df)} locations to locations.geojson")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Step 4: Export to GeoJSON

    Now we'll export the locations table to GeoJSON format for web display. This creates a standardized geographic data format that web mapping libraries can read directly.

    ## Optional: Adding Geology & SPT Data

    For technical stakeholders who need subsurface details, we can also export geology and Standard Penetration Test data. This will let users click on boreholes to see soil columns and test charts.

    We'll export:
    - 'Standard Penetration Test' data (`ISPT` group in AGS)
    - 'Geology' data (`GEOL` group in AGS)

    Here's a convenience function that groups test data by location and exports it as JSON:
    """
    )
    return


@app.cell
def _(geodf_to_df):
    def by_location_json_file(df, filename):
        by_location = geodf_to_df(df).drop('geometry', axis=1).groupby("location_uid")
        json_string = by_location.apply(lambda x: x.to_dict('records')).to_json()

        with open(filename, "w") as file:
            file.write(json_string)
    return (by_location_json_file,)


@app.cell
def _(by_location_json_file, geodb):
    geol_df = geodb.InSituTests["GEOL"]
    by_location_json_file(geol_df, "../webmap/geol.json")

    print(f"✅ Exported geology data for {len(geol_df['location_uid'].unique())} locations to geol.json")
    return


@app.cell
def _(by_location_json_file, geodb):
    ispt_df = geodb.InSituTests["ISPT"]
    by_location_json_file(ispt_df, "../webmap/ispt.json")

    print(f"✅ Exported SPT data for {len(ispt_df['location_uid'].unique())} locations to ispt.json")
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ## Next Steps

    You now have three files ready for web mapping:

    - `locations.geojson` - Borehole locations for the map
    - `geol.json` - Geology data for soil columns  
    - `ispt.json` - SPT data for test charts

    These files can be used with any web mapping library. The next step is to create the interactive web map using HTML, CSS, and JavaScript with MapLibre GL JS.
    """
    )
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
