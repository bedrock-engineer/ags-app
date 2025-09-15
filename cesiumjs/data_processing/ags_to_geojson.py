# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "bedrock-ge==0.3.2",
#     "geopandas==1.1.1",
#     "mapclassify==2.10.0",
#     "marimo",
#     "matplotlib==3.10.6",
#     "pyproj==3.7.2",
#     "shapely==2.1.1",
# ]
# ///

import marimo

__generated_with = "0.15.2"
app = marimo.App(width="medium", app_title="AGS3 to CesiumJS Webmap")


@app.cell(hide_code=True)
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

    We'll transform this technical data into **GeoJSON** which readable by web mapping libraries like CesiumJS.

    This lets us build interactive 3D maps where stakeholders can click on investigation locations to see detailed results, without needing expensive, specialized software.
    """
    )
    return


@app.cell
def _():
    import marimo as mo
    from pyproj import CRS, Transformer, network
    from pyproj.crs.crs import CompoundCRS
    from shapely.geometry import Point, LineString
    from pathlib import Path
    import json
    import geopandas as gpd
    return (
        CRS,
        CompoundCRS,
        LineString,
        Path,
        Point,
        Transformer,
        gpd,
        mo,
        network,
    )


@app.cell
def _():
    from bedrock_ge.gi.ags import ags_to_brgi_db_mapping
    from bedrock_ge.gi.db_operations import merge_dbs
    from bedrock_ge.gi.geospatial import create_brgi_geodb
    from bedrock_ge.gi.io_utils import geodf_to_df
    from bedrock_ge.gi.mapper import map_to_brgi_db
    return ags_to_brgi_db_mapping, create_brgi_geodb, map_to_brgi_db, merge_dbs


@app.cell
def _(CRS, CompoundCRS):
    projected_crs = CRS("EPSG:2326")  # Hong Kong 1980 Grid System
    vertical_crs = CRS("EPSG:5738")   # Hong Kong Principle Datum

    compound_crs = CompoundCRS(
        name=f"{projected_crs.name} + {vertical_crs.name}",
        components=[projected_crs, vertical_crs],
    )
    compound_crs
    return compound_crs, projected_crs, vertical_crs


@app.cell
def _(mo):
    mo.md(r"""CesiumJS only supports WGS84 Ellipsoidal height ([EPSG:4979](https://epsg.io/4979)). We have to transform the coordinates in our data to this CRS.""")
    return


@app.cell
def _(CRS):
    cesium_crs = CRS("EPSG:4979")
    cesium_crs
    return (cesium_crs,)


@app.cell
def _(Transformer, cesium_crs, compound_crs, network):
    transformer_compound = Transformer.from_crs(compound_crs, cesium_crs, always_xy=True)
    # This is crucial for proper height transformation! See https://proj.org/en/stable/usage/network.html
    network.set_network_enabled(active=True) 
    return (transformer_compound,)


@app.cell
def _(Path):
    folder_path = Path("../../data/kaitak_ags3")
    ags_files = list(folder_path.rglob("*AGS")) + list(folder_path.rglob("*ags"))
    return (ags_files,)


@app.cell
def _(geodb):
    point1 = geodb.InSituTests["ISPT"]["geometry"][5]
    (point1.x, point1.y, point1.z)
    return (point1,)


@app.cell
def _(point1, transformer_compound):
    transformer_compound.transform(point1.x, point1.y, point1.z)
    return


@app.cell
def _(cesium_crs, gpd, transform_geometry):
    def to_epsg_4979_3d(gdf) -> gpd.GeoDataFrame: 
        result = gdf.copy()
        result.geometry = gdf.geometry.apply(transform_geometry)
        result.crs = cesium_crs
        return result
    return (to_epsg_4979_3d,)


@app.cell
def _(LineString, Point, transformer_compound):
    def transform_geometry(geom):
        if geom is None:
            return None
        
        if geom.geom_type == 'Point':
            if geom.has_z:
                x, y, z = transformer_compound.transform(geom.x, geom.y, geom.z)
                return Point(x, y, z)
            else:
                x, y = transformer_compound.transform(geom.x, geom.y)
                return Point(x, y)
            
        elif geom.geom_type == 'LineString':
            coords = list(geom.coords)
            if len(coords[0]) == 3:  # Has Z
                x_list, y_list, z_list = zip(*coords)
                x_new, y_new, z_new = transformer_compound.transform(x_list, y_list, z_list)
                return LineString(list(zip(x_new, y_new, z_new)))
            else:  # 2D
                x_list, y_list = zip(*coords)
                x_new, y_new = transformer_compound.transform(x_list, y_list)
                return LineString(list(zip(x_new, y_new)))
        else:
            raise ValueError(f"Unsupported geometry type: {geom.geom_type}")
    return (transform_geometry,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Read AGS Files Using Bedrock

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


@app.cell
def _(merged_brgi_db):
    merged_brgi_db
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Make the Data Geospatial

    Now we'll transform our merged database into geospatial data.  `bedrock-ge` creates 3D geospatial geometries for boreholes, specifically vertical lines representing the full depth of each GI location.

    """
    )
    return


@app.cell
def _(create_brgi_geodb, merged_brgi_db):
    geodb = create_brgi_geodb(merged_brgi_db)
    return (geodb,)


@app.cell
def _(geodb):
    geodb.LonLatHeight.explore()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Location table: Select Data to Display

    Our map will display key information about each borehole. Let's select the columns from the `Location` DataFrame we want to show:

    - The identifier of the borehole: `HOLE_ID`
    - The type of borehole: `HOLE_TYPE`  
    - The start & end date of drilling: `HOLE_STAR` & `HOLE_ENDD`
    - Remarks: `HOLE_REM`
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
    mo.md(r"""Let's write it to geoJSON so we read this data in CesiumJS.""")
    return


@app.cell
def _(location_geodf, to_epsg_4979_3d):
    locations_geojson = to_epsg_4979_3d(location_geodf).to_json(to_wgs84=True)

    with open("../webmap/locations.geojson", "w") as file:
        file.write(locations_geojson)

    print(f"✅ Exported {len(location_geodf)} locations to locations.geojson")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""Let's look at what kind of hole types are inside:""")
    return


@app.cell
def _(geodb):
    list(geodb.Location["HOLE_TYPE"].unique())
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ### Abbreviations

    We want to show a legend for the different types of ground investigation holes.

    The meanings of these abbreviations are in the `ABBR` group of an AGS file. `bedrock-ge` puts this group in `Other` of the geospatial database. For the hole type meanings, we need the ones where `ABBR_HDNG` is equal to `HOLE_TYPE` from this table.
    """
    )
    return


@app.cell
def _(geodb):
    abbr = geodb.Other["ABBR"]
    abbr
    return (abbr,)


@app.cell
def _(abbr):
    hole_type_abbr_headings = abbr["ABBR_HDNG"] == "HOLE_TYPE"
    hole_type_legend_df = abbr[hole_type_abbr_headings]

    hole_type_legend = hole_type_legend_df[['ABBR_CODE', 'ABBR_DESC']].drop_duplicates()
    hole_type_dict = hole_type_legend.set_index('ABBR_CODE')['ABBR_DESC'].to_dict()
    hole_type_dict["Grab"] = "Grab sample" # This one is not an abbreviation despite being in the ABBR table
    hole_type_dict
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""We can copy this dict and use it as an object in our JavaScript to lookup abbreviations.""")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## In Situ

    Our data contains several tables for in-situ test. These can be found in the `InSituTests` property/attribute of the geospatial database.
    """
    )
    return


@app.cell
def _(geodb):
    list(geodb.InSituTests.keys())
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## Weathering `WETH`

    This in-situ weathering data follows the classification scheme of Brown 1981.

    See the [Guide to Rock and Soil Descriptions](https://www.cedd.gov.hk/filemanager/eng/content_111/eg3_1988_07.pdf) by the Geotechnical Engineering Office by the Civil Engineering Department of the Government of Hong Kong.


    | Class | Term | Description |
    |-------|------|-------------|
    | I | Fresh rock | No visible sign of rock material weathering |
    | II | Slightly weathered rock | Discolouration indicates weathering of rock materials and discontinuity surfaces |
    | III | Moderately weathered rock | Less than half of the rock material is decomposed and/or disintegrated to soil |
    | IV | Highly weathered rock | More than half of the rock material is decomposed and/or disintegrated to soil |
    | V | Completely weathered rock | All rock material is decomposed and/or disintegrated to soil. The original mass structure is still largely intact |
    | VI | Residual soil | All rock material is converted to soil. The mass structure and material fabric are destroyed |

    Weathering data are cores which are represented as LineString geometries in our geospatial database.
    """
    )
    return


@app.cell
def _(geodb, to_epsg_4979_3d):
    weathering_grade_df = to_epsg_4979_3d(geodb.InSituTests["WETH"])

    weathering_grade_geojson = weathering_grade_df.to_json(to_wgs84=True)

    with open("../webmap/weathering.geojson", "w") as weathering_grade_file:
        weathering_grade_file.write(weathering_grade_geojson)
    return (weathering_grade_df,)


@app.cell
def _(weathering_grade_df):
    sorted(list(weathering_grade_df["WETH_GRAD"].unique()))
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""And we seem to have some offbeat weathering grades in there as well.""")
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## SPT

    Standard Penetration Tests are Point geometries.
    """
    )
    return


@app.cell
def _(geodb):
    geodb.InSituTests["ISPT"]
    return


@app.cell
def _(geodb, spt_types, to_epsg_4979_3d):
    ispt_df = to_epsg_4979_3d(geodb.InSituTests["ISPT"])
    ispt_df["ISPT_TYPE"] = ispt_df["ISPT_TYPE"].map(spt_types)

    ispt_geojson = ispt_df.to_json(to_wgs84=True)

    with open("../webmap/ispt.geojson", "w") as ispt_file:
        ispt_file.write(ispt_geojson)
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""In this table, SPT types are single letters, which not very clear for stakeholders. Let's look up the SPT Types in the ABBR table and replace the codes with the full names in the SPT table.""")
    return


@app.cell
def _(abbr):
    spt_type_abbr = abbr["ABBR_HDNG"] == "ISPT_TYPE"
    spt_types = abbr[spt_type_abbr].set_index('ABBR_CODE')['ABBR_DESC'].to_dict()
    spt_types
    return (spt_types,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    ## In the Weeds: CRS Information in geoJSON

    The [GeoJSON specification](https://datatracker.ietf.org/doc/html/rfc7946) creates a slightly confusing situation around coordinate reference systems (CRS). 

    The specification states that EPSG:4326 (WGS84 longitude/latitude in degrees, no elevation) is the only valid CRS in GeoJSON. At the same time, it allows an optional third coordinate defined as “height in meters above or below the WGS 84 reference ellipsoid”. Which makes it definition of EPSG:4979, not EPSG:4326.

    ## Library Implementations

    Next to that, different tools handle CRS metadata in GeoJSON inconsistently.
    GeoPandas [writes CRS information to GeoJSON files](https://geopandas.org/en/stable/docs/reference/api/geopandas.GeoDataFrame.to_json.html) when the CRS is not EPSG:4326 or cannot be expressed as the required OGC URN.
    But CesiumJS enforces strict GeoJSON spec compliance. So when it finds a `crs` property in GeoJSON, it will throw errors. The fix is to remove the `crs` property from the GeoJSON after we have written it.

    ## Coordinate Order

    A final point of confusion is coordinate order.
    The specification references `urn:ogc:def:crs:OGC::CRS84` as “equivalent” to EPSG:4326.

    Whereas GeoJSON’s coordinate arrays (CRS84) uses `longitude`, `latitude` order, matching the `X`, `Y` order of math.
    This is way we must pass `always_xy=True` keyword argument to `Transformer.from_crs()`.
    """
    )
    return


@app.cell
def _():
    return


if __name__ == "__main__":
    app.run()
