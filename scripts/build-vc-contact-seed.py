from __future__ import annotations

import csv
import io
import json
import math
from pathlib import Path
from typing import Any, TypeVar

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
INPUT_FILE = Path(r"C:\Users\sreek\Downloads\2000 Plus VC Contact Emails.xlsx")
OUTPUT_FILE = ROOT / "supabase" / "seed.sql"
TS_OUTPUT_FILE = ROOT / "src" / "data" / "vc-contact-seed.ts"
T = TypeVar("T")

COORDINATES: dict[str, tuple[float, float]] = {
    "alexandria": (38.8048, -77.0469),
    "amsterdam": (52.3676, 4.9041),
    "atlanta": (33.7490, -84.3880),
    "austin": (30.2672, -97.7431),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "beijing": (39.9042, 116.4074),
    "berlin": (52.5200, 13.4050),
    "boston": (42.3601, -71.0589),
    "boulder": (40.0150, -105.2705),
    "brooklyn": (40.6782, -73.9442),
    "buffalo": (42.8864, -78.8784),
    "burlingame": (37.5779, -122.3481),
    "cambridge": (42.3736, -71.1097),
    "campbell": (37.2872, -121.9500),
    "cayman islands": (19.3133, -81.2546),
    "chicago": (41.8781, -87.6298),
    "cincinnati": (39.1031, -84.5120),
    "copenhagen": (55.6761, 12.5683),
    "dallas": (32.7767, -96.7970),
    "delhi": (28.6139, 77.2090),
    "denver": (39.7392, -104.9903),
    "dubai": (25.2048, 55.2708),
    "durham": (35.9940, -78.8986),
    "greenwich": (41.0262, -73.6282),
    "herzliya": (32.1624, 34.8447),
    "hong kong": (22.3193, 114.1694),
    "houston": (29.7604, -95.3698),
    "hyderabad": (17.3850, 78.4867),
    "jacksonville": (30.3322, -81.6557),
    "london": (51.5072, -0.1276),
    "los altos": (37.3852, -122.1141),
    "los angeles": (34.0522, -118.2437),
    "luxembourg": (49.6116, 6.1319),
    "maryland": (39.0458, -76.6413),
    "menlo park": (37.4530, -122.1817),
    "miami": (25.7617, -80.1918),
    "minneapolis": (44.9778, -93.2650),
    "montreal": (45.5019, -73.5674),
    "mountain view": (37.3861, -122.0839),
    "mumbai": (19.0760, 72.8777),
    "munich": (48.1351, 11.5820),
    "nashville": (36.1627, -86.7816),
    "new york": (40.7128, -74.0060),
    "nyc": (40.7128, -74.0060),
    "oakland": (37.8044, -122.2712),
    "palo alto": (37.4419, -122.1430),
    "paris": (48.8566, 2.3522),
    "portland": (45.5152, -122.6784),
    "portola valley": (37.3841, -122.2352),
    "pune": (18.5204, 73.8567),
    "raleigh": (35.7796, -78.6382),
    "redwood city": (37.4852, -122.2364),
    "salt lake city": (40.7608, -111.8910),
    "san diego": (32.7157, -117.1611),
    "san francisco": (37.7749, -122.4194),
    "san jose": (37.3382, -121.8863),
    "san mateo": (37.5630, -122.3255),
    "santa monica": (34.0195, -118.4912),
    "sausalito": (37.8591, -122.4853),
    "seattle": (47.6062, -122.3321),
    "shanghai": (31.2304, 121.4737),
    "singapore": (1.3521, 103.8198),
    "st louis": (38.6270, -90.1994),
    "stockholm": (59.3293, 18.0686),
    "sydney": (-33.8688, 151.2093),
    "sao paulo": (-23.5558, -46.6396),
    "são paulo": (-23.5558, -46.6396),
    "tel aviv": (32.0853, 34.7818),
    "tokyo": (35.6762, 139.6503),
    "toronto": (43.6532, -79.3832),
    "vancouver": (49.2827, -123.1207),
    "vienna": (48.2082, 16.3738),
    "virginia": (37.4316, -78.6569),
    "washington": (38.9072, -77.0369),
    "washington dc": (38.9072, -77.0369),
    "zurich": (47.3769, 8.5417),
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def to_int(value: Any) -> int | None:
    text = clean(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def normalize_city(location: str) -> str:
    text = location.strip()
    if not text:
        return ""
    first = text.split("/")[0].split(",")[0].strip()
    lower = first.lower()
    if lower in {"nyc", "new york city"}:
        return "New York"
    if lower in {"sf"}:
        return "San Francisco"
    return first


def coordinates_for(location: str) -> tuple[float | None, float | None]:
    city = normalize_city(location)
    key = city.lower()
    if key in COORDINATES:
        return COORDINATES[key]

    lower_location = location.lower()
    for alias, coordinates in COORDINATES.items():
        if alias in lower_location:
            return coordinates

    return None, None


def sql_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def cell(row: tuple[Any, ...], index: dict[str, int], header: str) -> Any:
    position = index[header]
    return row[position] if position < len(row) else None


def chunked(values: list[T], size: int) -> list[list[T]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def main() -> None:
    workbook = openpyxl.load_workbook(INPUT_FILE, read_only=True, data_only=True)
    worksheet = workbook[workbook.sheetnames[0]]
    rows = worksheet.iter_rows(values_only=True)
    headers = [clean(value) for value in next(rows)]
    index = {header: headers.index(header) for header in headers}

    records: list[tuple[Any, ...]] = []
    seed_records: list[dict[str, Any]] = []
    for row_number, row in enumerate(rows, start=2):
        if not row or not any(row):
            continue

        location = clean(cell(row, index, "Location"))
        normalized_city = normalize_city(location)
        latitude, longitude = coordinates_for(location)
        investments = to_int(cell(row, index, "Number of Investments")) or 0
        exits = to_int(cell(row, index, "Number of Exits")) or 0

        record = (
            row_number,
            clean(cell(row, index, "Investor Name")),
            clean(cell(row, index, "Fund Type")),
            clean(cell(row, index, "Fund Stage")),
            clean(cell(row, index, "Website")),
            clean(cell(row, index, "Fund Focus (Sectors)")),
            clean(cell(row, index, "Partner Name")),
            clean(cell(row, index, "Partner Email")),
            clean(cell(row, index, "Portfolio Companies")),
            location,
            normalized_city,
            latitude,
            longitude,
            clean(cell(row, index, "Twitter Link")),
            clean(cell(row, index, "LinkedIn Link")),
            clean(cell(row, index, "Facebook Link")),
            investments,
            exits,
            clean(cell(row, index, "Fund Description")),
            to_int(cell(row, index, "Founding Year")),
        )
        records.append(record)
        seed_records.append(
            {
                "id": f"seed-vc-contact-{row_number}",
                "investorName": record[1],
                "fundType": record[2],
                "fundStage": record[3],
                "website": record[4],
                "fundFocusSectors": record[5],
                "partnerName": record[6],
                "partnerEmail": record[7],
                "portfolioCompanies": record[8],
                "location": record[9],
                "normalizedCity": record[10],
                "latitude": record[11],
                "longitude": record[12],
                "twitterUrl": record[13],
                "linkedinUrl": record[14],
                "facebookUrl": record[15],
                "numberOfInvestments": record[16],
                "numberOfExits": record[17],
                "fundDescription": record[18],
                "foundingYear": record[19],
            }
        )

    columns = [
        "source_row_number",
        "investor_name",
        "fund_type",
        "fund_stage",
        "website",
        "fund_focus_sectors",
        "partner_name",
        "partner_email",
        "portfolio_companies",
        "location",
        "normalized_city",
        "latitude",
        "longitude",
        "twitter_url",
        "linkedin_url",
        "facebook_url",
        "number_of_investments",
        "number_of_exits",
        "fund_description",
        "founding_year",
    ]
    assignments = ",\n    ".join(f"{column} = excluded.{column}" for column in columns[1:])

    output = io.StringIO()
    output.write("-- Generated from C:\\\\Users\\\\sreek\\\\Downloads\\\\2000 Plus VC Contact Emails.xlsx\n")
    output.write("-- Regenerate with: python scripts/build-vc-contact-seed.py\n\n")

    for batch in chunked(records, 250):
        output.write(f"insert into public.vc_contacts ({', '.join(columns)})\nvalues\n")
        output.write(
            ",\n".join(
                "  (" + ", ".join(sql_literal(value) for value in record) + ")"
                for record in batch
            )
        )
        output.write(
            "\non conflict (source_row_number) do update set\n"
            f"    {assignments},\n"
            "    updated_at = now();\n\n"
        )

    OUTPUT_FILE.write_text(output.getvalue(), encoding="utf-8", newline="\n")
    TS_OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    TS_OUTPUT_FILE.write_text(
        "import type { VCContact } from '@/lib/apparent-types';\n\n"
        "// Generated from C:\\\\Users\\\\sreek\\\\Downloads\\\\2000 Plus VC Contact Emails.xlsx\n"
        "// Regenerate with: python scripts/build-vc-contact-seed.py\n"
        f"export const vcContactSeed = {json.dumps(seed_records, ensure_ascii=False, separators=(',', ':'))} satisfies VCContact[];\n",
        encoding="utf-8",
        newline="\n",
    )
    plotted = sum(1 for record in records if record[11] is not None and record[12] is not None)
    print(f"Wrote {len(records)} VC contacts to {OUTPUT_FILE}")
    print(f"Wrote local app fallback to {TS_OUTPUT_FILE}")
    print(f"{plotted} contacts include derived coordinates for heat-map plotting")


if __name__ == "__main__":
    main()
