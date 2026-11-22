# Scientific provenance and simulation review checklist

Universe combines astronomical facts with procedural content. This checklist is for any PR adding a celestial object, numeric scientific parameter, scale claim, or generated scene. It is a **review policy**, not evidence that existing data has been audited.

## Label each displayed claim

Use one of these categories in data and user-facing copy:

| Category | Meaning | Appropriate wording |
| --- | --- | --- |
| Observed / measured | Supported by an identified observation or catalog record | "Catalog reports …" with source and date |
| Derived / estimated | Inferred from measurements or a model; uncertainty matters | "Estimated …" with method, assumptions, and uncertainty |
| Theoretical | A scientific model or hypothesis, not a direct observation | "Model predicts …" |
| Procedural / fictional | Synthesized for exploration, not a catalog object | "Simulated system" |
| Unknown / unavailable | No defensible value is available | "Unknown"; do not substitute zero |

**Never** present generated star systems, planet classes, orbital elements, surface textures, or distances as discovered objects. A plausible distribution is not observational validation.

## Required evidence for factual additions

- Identify the exact claim or field, unit, coordinate/reference frame where applicable, and object identifier.
- Link the specific source record, table, or publication, not just an institution homepage; record the retrieval date and catalog/data release when available.
- Preserve source uncertainty, upper/lower limits, and missing-value flags. Do not silently turn a limit into a measurement.
- Distinguish measured from derived quantities; record model assumptions for derived values.
- Explain transformations: unit conversion, epoch, rounding, and any scaling used solely for rendering.
- Avoid implying that rendered sizes and separations share a physical scale unless they actually do.
- If two sources disagree, document the choice and avoid claiming false precision.

## Useful primary reference starting points

These are discovery entry points; cite the **specific record** used in a change.

- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) for published exoplanet and host-star parameters, with catalog-specific definitions.
- [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/) for Solar System orbital and physical data and their reference frames.
- [ESA Gaia Archive](https://gea.esac.esa.int/archive/) for stellar astrometry, including release-specific quality indicators.
- [IAU](https://www.iau.org/) for astronomical naming and relevant conventions.

A source's existence does not verify a particular displayed value. Check licensing and attribution requirements before importing datasets or imagery.

## Procedural generation review

- Use an explicit simulated/procedural label in the UI and exported data.
- Make random seeds reproducible in tests where feasible.
- Check numeric inputs are finite and bounds are enforced; avoid unbounded object counts.
- Test invariants (nonnegative radii/masses, finite coordinates, valid ordering where assumed) without calling a distribution physically accurate merely because tests pass.
- Describe any statistical priors as **design assumptions** until compared against appropriate observational selection effects and published research.
- Keep procedural and catalog identifiers in separate namespaces so they cannot be mistaken for one another.

## PR evidence template

```text
Claim or dataset:
Category (measured / estimated / theoretical / procedural / unknown):
Exact source record and release:
Retrieved (UTC date):
Units, epoch, reference frame:
Uncertainty / limits / missing values:
Transformation or rendering exaggeration:
Validation performed (commands/results):
What remains unverified:
```

For code changes, run the repository's documented checks (`npm test`, `npm run check:packages`, `npm run check`) and report the actual results. Passing these checks does **not** establish scientific correctness. For documentation-only changes, review source links and wording; do not claim runtime verification.
