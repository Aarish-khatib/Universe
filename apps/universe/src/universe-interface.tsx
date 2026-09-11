import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  EntityId,
} from "@known-universe/core";

import type {
  UniverseObjectView,
  UniverseScienceView,
  UniverseSearchResult,
  UniverseSession,
  UniverseSessionMetrics,
  UniverseSessionSnapshot,
  UniverseViewMode,
} from "./universe-session";

import { DiscoveryPanel } from "./Components/DiscoveryPanel";
import { WaypointPanel } from "./Components/WaypointPanel";


export const UNIVERSE_INTERFACE_VERSION =
  1;


/* ============================================================
   CHECKPOINT 1
   Public interface contract
   ============================================================ */


export interface UniverseInterfaceProps {
  session:
    UniverseSession;

  snapshot:
    UniverseSessionSnapshot;

  title?:
    string;

  subtitle?:
    string;

  showDebugMetrics?:
    boolean;
}


export interface UniverseInterfaceHandle {
  focusSearch():
    void;

  openSearch():
    void;

  closeTransientPanels():
    void;

  openCatalog():
    void;

  openScience():
    void;
}


type ScienceTab =
  | "overview"
  | "orbit"
  | "position"
  | "sources"
  | "renderer";


type CatalogFilter =
  | "all"
  | "stars"
  | "planets"
  | "moons"
  | "other";


type SearchPresentation =
  | "closed"
  | "suggestions"
  | "expanded";


interface CatalogSection {
  id:
    string;

  label:
    string;

  objects:
    UniverseObjectView[];
}


interface InterfaceSearchState {
  mode:
    SearchPresentation;

  query:
    string;

  activeIndex:
    number;
}


interface ObjectBadge {
  label:
    string;

  tone:
    "neutral" |
    "warm" |
    "cool" |
    "mint" |
    "violet";
}


const SEARCH_RESULT_LIMIT =
  12;


const EMPTY_SEARCH:
  InterfaceSearchState = {
  mode:
    "closed",

  query:
    "",

  activeIndex:
    0,
};


const CATALOG_FILTERS:
  readonly {
    id:
      CatalogFilter;

    label:
      string;
  }[] = [
  {
    id:
      "all",

    label:
      "All",
  },

  {
    id:
      "stars",

    label:
      "Stars",
  },

  {
    id:
      "planets",

    label:
      "Planets",
  },

  {
    id:
      "moons",

    label:
      "Moons",
  },

  {
    id:
      "other",

    label:
      "Other",
  },
];


const SCIENCE_TABS:
  readonly {
    id:
      ScienceTab;

    label:
      string;
  }[] = [
  {
    id:
      "overview",

    label:
      "Overview",
  },

  {
    id:
      "orbit",

    label:
      "Orbit",
  },

  {
    id:
      "position",

    label:
      "Position",
  },

  {
    id:
      "sources",

    label:
      "Sources",
  },

  {
    id:
      "renderer",

    label:
      "System",
  },
];


/* ============================================================
   CHECKPOINT 2
   Presentation helpers
   ============================================================ */


function classNames(
  ...values:
    (
      string |
      false |
      null |
      undefined
    )[]
):
  string {
  return values
    .filter(Boolean)
    .join(" ");
}


function titleCase(
  value:
    string,
):
  string {
  return value
    .split(
      /[-_\s]+/g,
    )
    .filter(Boolean)
    .map(
      part =>
        part.length >
        0
          ? part[0]
              ?.toUpperCase() +
            part.slice(1)
          : part,
    )
    .join(" ");
}


function objectGlyph(
  object:
    UniverseObjectView,
):
  string {
  switch (
    object.id
  ) {
    case "sun":
      return "☀";

    case "mercury":
      return "◉";

    case "venus":
      return "●";

    case "earth":
      return "◉";

    case "moon":
      return "◐";

    case "mars":
      return "●";

    case "jupiter":
      return "◉";

    case "saturn":
      return "◍";

    case "uranus":
      return "●";

    case "neptune":
      return "●";
  }


  switch (
    object.kind
  ) {
    case "star":
      return "✦";

    case "planet":
      return "●";

    case "dwarf-planet":
      return "◌";

    case "moon":
      return "◐";

    case "asteroid":
      return "◆";

    case "comet":
      return "✧";

    case "satellite":
      return "◇";

    case "spacecraft":
      return "△";

    case "debris":
      return "·";

    case "black-hole":
      return "◉";

    case "neutron-star":
      return "✹";

    case "nebula":
      return "☁";

    case "star-cluster":
      return "✣";

    case "galaxy":
      return "◎";

    case "galaxy-group":
    case "galaxy-cluster":
      return "◉";

    case "cosmic-structure":
      return "⌁";

    case "surface-feature":
      return "⌖";

    case "building":
      return "▥";

    case "city":
      return "▦";

    case "country":
      return "◇";
  }
}


function objectTone(
  object:
    UniverseObjectView,
):
  string {
  switch (
    object.id
  ) {
    case "sun":
      return "sun";

    case "mercury":
      return "mercury";

    case "venus":
      return "venus";

    case "earth":
      return "earth";

    case "moon":
      return "moon";

    case "mars":
      return "mars";

    case "jupiter":
      return "jupiter";

    case "saturn":
      return "saturn";

    case "uranus":
      return "uranus";

    case "neptune":
      return "neptune";

    default:
      return object.kind;
  }
}


function objectBadges(
  object:
    UniverseObjectView,
):
  ObjectBadge[] {
  const badges:
    ObjectBadge[] = [];


  if (
    object.focused
  ) {
    badges.push({
      label:
        "Focus",

      tone:
        "violet",
    });
  }


  if (
    object.selected
  ) {
    badges.push({
      label:
        "Selected",

      tone:
        "mint",
    });
  }


  if (
    object.sourceIds.length >
    0
  ) {
    badges.push({
      label:
        `${object.sourceIds.length} source${
          object.sourceIds.length ===
          1
            ? ""
            : "s"
        }`,

      tone:
        "cool",
    });
  }


  if (
    object.radiusEvidence !==
    "unknown"
  ) {
    badges.push({
      label:
        titleCase(
          object.radiusEvidence,
        ),

      tone:
        "neutral",
    });
  }


  return badges;
}


function catalogFilterMatches(
  object:
    UniverseObjectView,

  filter:
    CatalogFilter,
):
  boolean {
  switch (
    filter
  ) {
    case "all":
      return true;

    case "stars":
      return (
        object.kind ===
          "star" ||
        object.kind ===
          "neutron-star"
      );

    case "planets":
      return (
        object.kind ===
          "planet" ||
        object.kind ===
          "dwarf-planet"
      );

    case "moons":
      return (
        object.kind ===
        "moon"
      );

    case "other":
      return (
        object.kind !==
          "star" &&
        object.kind !==
          "neutron-star" &&
        object.kind !==
          "planet" &&
        object.kind !==
          "dwarf-planet" &&
        object.kind !==
          "moon"
      );
  }
}


function createCatalogSections(
  objects:
    readonly UniverseObjectView[],

  filter:
    CatalogFilter,
):
  CatalogSection[] {
  const filtered =
    objects.filter(
      object =>
        catalogFilterMatches(
          object,
          filter,
        ),
    );


  const starObjects =
    filtered.filter(
      object =>
        object.kind ===
          "star" ||
        object.kind ===
          "neutron-star",
    );


  const planets =
    filtered.filter(
      object =>
        object.kind ===
          "planet" ||
        object.kind ===
          "dwarf-planet",
    );


  const moons =
    filtered.filter(
      object =>
        object.kind ===
        "moon",
    );


  const other =
    filtered.filter(
      object =>
        !starObjects.includes(
          object,
        ) &&
        !planets.includes(
          object,
        ) &&
        !moons.includes(
          object,
        ),
    );


  const sections:
    CatalogSection[] = [];


  if (
    starObjects.length >
    0
  ) {
    sections.push({
      id:
        "stars",

      label:
        "Stars",

      objects:
        starObjects,
    });
  }


  if (
    planets.length >
    0
  ) {
    sections.push({
      id:
        "planets",

      label:
        "Planets",

      objects:
        planets,
    });
  }


  if (
    moons.length >
    0
  ) {
    sections.push({
      id:
        "moons",

      label:
        "Moons",

      objects:
        moons,
    });
  }


  if (
    other.length >
    0
  ) {
    sections.push({
      id:
        "other",

      label:
        "Other objects",

      objects:
        other,
    });
  }


  return sections;
}


function evidenceLabel(
  value:
    string,
):
  string {
  if (
    value ===
    "unknown"
  ) {
    return "Unknown";
  }


  return titleCase(
    value,
  );
}


function searchMatchDescription(
  result:
    UniverseSearchResult,
):
  string {
  if (
    result.matchedName
  ) {
    return "Name";
  }


  if (
    result.matchedAlias
  ) {
    return "Alias";
  }


  if (
    result.matchedKind
  ) {
    return "Object type";
  }


  if (
    result.matchedSummary
  ) {
    return "Description";
  }


  return "Catalog";
}


/* ============================================================
   CHECKPOINT 3
   Small reusable UI pieces
   ============================================================ */


function IconButton(
  props: {
    label:
      string;

    icon:
      string;

    active?:
      boolean;

    disabled?:
      boolean;

    onClick():
      void;
  },
) {
  return (
    <button
      type="button"
      className={classNames(
        "universe-icon-button",

        props.active &&
          "is-active",
      )}
      aria-label={
        props.label
      }
      title={
        props.label
      }
      disabled={
        props.disabled
      }
      onClick={
        props.onClick
      }
    >
      <span
        aria-hidden="true"
        className="universe-icon-button-symbol"
      >
        {
          props.icon
        }
      </span>
    </button>
  );
}


function Pill(
  props: {
    children:
      React.ReactNode;

    tone?:
      ObjectBadge["tone"];
  },
) {
  return (
    <span
      className={classNames(
        "universe-pill",

        props.tone &&
          `universe-pill-${props.tone}`,
      )}
    >
      {
        props.children
      }
    </span>
  );
}


function MetricRow(
  props: {
    label:
      string;

    value:
      React.ReactNode;

    hint?:
      React.ReactNode;
  },
) {
  return (
    <div className="science-metric-row">
      <div className="science-metric-label">
        {
          props.label
        }
      </div>

      <div className="science-metric-value">
        {
          props.value
        }

        {props.hint && (
          <small>
            {
              props.hint
            }
          </small>
        )}
      </div>
    </div>
  );
}


function EmptyState(
  props: {
    title:
      string;

    description:
      string;
  },
) {
  return (
    <div className="universe-empty-state">
      <div className="universe-empty-symbol">
        ◌
      </div>

      <strong>
        {
          props.title
        }
      </strong>

      <p>
        {
          props.description
        }
      </p>
    </div>
  );
}


/* ============================================================
   CHECKPOINT 4
   Search interface
   ============================================================ */


function SearchResultRow(
  props: {
    result:
      UniverseSearchResult;

    active:
      boolean;

    session:
      UniverseSession;

    onTravel(
      id:
        EntityId,
    ): void;
  },
) {
  const object =
    props.result.entity;


  return (
    <button
      type="button"
      className={classNames(
        "universe-search-result",

        props.active &&
          "is-active",
      )}
      onClick={
        () =>
          props.onTravel(
            object.id,
          )
      }
    >
      <span
        className={classNames(
          "universe-search-result-orb",

          `tone-${objectTone(
            object,
          )}`,
        )}
      >
        {
          objectGlyph(
            object,
          )
        }
      </span>


      <span className="universe-search-result-copy">
        <strong>
          {
            object.name
          }
        </strong>

        <small>
          {
            titleCase(
              object.kind,
            )
          }

          {" · "}

          {
            searchMatchDescription(
              props.result,
            )
          }
        </small>
      </span>


      <span className="universe-search-result-distance">
        {
          props.session.formatDistance(
            object
              .distanceFromOriginMeters,
          )
        }
      </span>


      <span className="universe-search-result-arrow">
        →
      </span>
    </button>
  );
}


/* ============================================================
   CHECKPOINT 5
   Catalog
   ============================================================ */


function CatalogObjectRow(
  props: {
    object:
      UniverseObjectView;

    session:
      UniverseSession;

    onSelect(
      id:
        EntityId,
    ): void;

    onTravel(
      id:
        EntityId,
    ): void;
  },
) {
  const object =
    props.object;


  return (
    <article
      className={classNames(
        "catalog-object-row",

        object.selected &&
          "is-selected",

        object.focused &&
          "is-focused",
      )}
    >
      <button
        type="button"
        className="catalog-object-primary"
        onClick={
          () =>
            props.onSelect(
              object.id,
            )
        }
      >
        <span
          className={classNames(
            "catalog-object-orb",

            `tone-${objectTone(
              object,
            )}`,
          )}
        >
          {
            objectGlyph(
              object,
            )
          }
        </span>


        <span className="catalog-object-copy">
          <strong>
            {
              object.name
            }
          </strong>

          <small>
            {
              titleCase(
                object.kind,
              )
            }

            {object.parentName && (
              <>
                {" · "}

                {
                  object.parentName
                }
              </>
            )}
          </small>
        </span>
      </button>


      <button
        type="button"
        className="catalog-object-travel"
        title={`Travel to ${object.name}`}
        aria-label={`Travel to ${object.name}`}
        onClick={
          () =>
            props.onTravel(
              object.id,
            )
        }
      >
        →
      </button>
    </article>
  );
}


/* ============================================================
   CHECKPOINT 6
   Explore object card
   ============================================================ */


function ExploreObjectCard(
  props: {
    object:
      UniverseObjectView;

    session:
      UniverseSession;

    onTravel():
      void;

    onScience():
      void;
  },
) {
  const object =
    props.object;


  const badges =
    objectBadges(
      object,
    );


  return (
    <section
      className="explore-object-card"
      data-object-tone={
        objectTone(
          object,
        )
      }
    >
      <div className="explore-object-visual">
        <span className="explore-object-glow" />

        <span className="explore-object-symbol">
          {
            objectGlyph(
              object,
            )
          }
        </span>
      </div>


      <div className="explore-object-heading">
        <div>
          <small>
            {
              titleCase(
                object.kind,
              )
            }
          </small>

          <h1>
            {
              object.name
            }
          </h1>
        </div>


        {badges.length >
          0 && (
          <div className="explore-object-badges">
            {badges
              .slice(
                0,
                3,
              )
              .map(
                badge => (
                  <Pill
                    key={`${badge.label}-${badge.tone}`}
                    tone={
                      badge.tone
                    }
                  >
                    {
                      badge.label
                    }
                  </Pill>
                ),
              )}
          </div>
        )}
      </div>


      {object.summary && (
        <p className="explore-object-summary">
          {
            object.summary
          }
        </p>
      )}


      <div className="explore-object-facts">
        <div>
          <small>
            Distance
          </small>

          <strong>
            {
              props.session.formatDistance(
                object
                  .distanceFromOriginMeters,
              )
            }
          </strong>
        </div>


        <div>
          <small>
            Radius
          </small>

          <strong>
            {
              props.session.formatDistance(
                object.radiusMeters,
              )
            }
          </strong>
        </div>
      </div>


      <div className="explore-object-actions">
        <button
          type="button"
          className="explore-primary-action"
          onClick={
            props.onTravel
          }
        >
          <span>
            Travel
          </span>

          <span>
            →
          </span>
        </button>


        <button
          type="button"
          className="explore-secondary-action"
          onClick={
            props.onScience
          }
        >
          Science
        </button>
      </div>
    </section>
  );
}


/* ============================================================
   CHECKPOINT 7
   Science panels
   ============================================================ */


function ScienceOverviewPanel(
  props: {
    object:
      UniverseObjectView;

    science:
      UniverseScienceView;

    session:
      UniverseSession;
  },
) {
  return (
    <div className="science-tab-content">
      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            OBJECT
          </small>

          <h3>
            Physical properties
          </h3>
        </div>


        <div className="science-metric-list">
          <MetricRow
            label="Object type"
            value={
              titleCase(
                props.object.kind,
              )
            }
          />

          <MetricRow
            label="Radius"
            value={
              props.session.formatDistance(
                props.science.radiusMeters,
              )
            }
            hint={
              evidenceLabel(
                props.science.radiusEvidence,
              )
            }
          />

          <MetricRow
            label="Mass"
            value={
              props.session.formatMass(
                props.science.massKg,
              )
            }
            hint={
              evidenceLabel(
                props.science.massEvidence,
              )
            }
          />

          <MetricRow
            label="Parent"
            value={
              props.object.parentName ??
              "None"
            }
          />

          <MetricRow
            label="Distance from origin"
            value={
              props.session.formatDistance(
                props.science
                  .distanceFromOriginMeters,
              )
            }
          />
        </div>
      </section>


      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            KNOWLEDGE
          </small>

          <h3>
            Scientific confidence
          </h3>
        </div>


        <div className="science-evidence-grid">
          <article>
            <span>
              Radius
            </span>

            <strong>
              {
                evidenceLabel(
                  props.science
                    .radiusEvidence,
                )
              }
            </strong>
          </article>

          <article>
            <span>
              Mass
            </span>

            <strong>
              {
                evidenceLabel(
                  props.science
                    .massEvidence,
                )
              }
            </strong>
          </article>

          <article>
            <span>
              Sources
            </span>

            <strong>
              {
                props.science
                  .sourceIds
                  .length
              }
            </strong>
          </article>
        </div>
      </section>
    </div>
  );
}


function ScienceOrbitPanel(
  props: {
    science:
      UniverseScienceView;

    session:
      UniverseSession;
  },
) {
  const hasOrbit =
    props.science
      .semiMajorAxisMeters !==
      null ||
    props.science
      .eccentricity !==
      null ||
    props.science
      .inclinationDegrees !==
      null;


  if (
    !hasOrbit
  ) {
    return (
      <EmptyState
        title="No orbit attached"
        description="This object does not currently expose orbital elements in the loaded scientific catalog."
      />
    );
  }


  return (
    <div className="science-tab-content">
      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            ORBIT
          </small>

          <h3>
            Orbital elements
          </h3>
        </div>


        <div className="science-metric-list">
          <MetricRow
            label="Semi-major axis"
            value={
              props.session.formatDistance(
                props.science
                  .semiMajorAxisMeters,
              )
            }
          />

          <MetricRow
            label="Eccentricity"
            value={
              props.science
                .eccentricity ===
              null
                ? "Unknown"
                : props.science
                    .eccentricity
                    .toFixed(
                      7,
                    )
            }
          />

          <MetricRow
            label="Inclination"
            value={
              props.science
                .inclinationDegrees ===
              null
                ? "Unknown"
                : `${props.science
                    .inclinationDegrees
                    .toFixed(
                      5,
                    )}°`
            }
          />

          <MetricRow
            label="Ascending node"
            value={
              props.science
                .longitudeAscendingNodeDegrees ===
              null
                ? "Unknown"
                : `${props.science
                    .longitudeAscendingNodeDegrees
                    .toFixed(
                      5,
                    )}°`
            }
          />

          <MetricRow
            label="Argument of periapsis"
            value={
              props.science
                .argumentPeriapsisDegrees ===
              null
                ? "Unknown"
                : `${props.science
                    .argumentPeriapsisDegrees
                    .toFixed(
                      5,
                    )}°`
            }
          />
        </div>
      </section>


      <div className="science-information-note">
        Orbital elements are shown from the currently loaded scientific data source and should not be interpreted as higher precision than that source provides.
      </div>
    </div>
  );
}


function SciencePositionPanel(
  props: {
    science:
      UniverseScienceView;

    session:
      UniverseSession;
  },
) {
  const position =
    props.science
      .position;


  return (
    <div className="science-tab-content">
      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            POSITION
          </small>

          <h3>
            Reference frame
          </h3>
        </div>


        <div className="science-metric-list">
          <MetricRow
            label="Frame"
            value={
              props.science
                .referenceFrame ??
              "Unknown"
            }
          />

          <MetricRow
            label="Coordinate unit"
            value={
              props.science
                .coordinateUnit ??
              "Unknown"
            }
          />

          <MetricRow
            label="Distance from origin"
            value={
              props.session.formatDistance(
                props.science
                  .distanceFromOriginMeters,
              )
            }
          />
        </div>
      </section>


      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            COORDINATES
          </small>

          <h3>
            Cartesian position
          </h3>
        </div>


        {position ? (
          <div className="science-coordinate-grid">
            <article>
              <span>
                X
              </span>

              <strong>
                {
                  props.session.formatCoordinate(
                    position[0],
                  )
                }
              </strong>
            </article>

            <article>
              <span>
                Y
              </span>

              <strong>
                {
                  props.session.formatCoordinate(
                    position[1],
                  )
                }
              </strong>
            </article>

            <article>
              <span>
                Z
              </span>

              <strong>
                {
                  props.session.formatCoordinate(
                    position[2],
                  )
                }
              </strong>
            </article>
          </div>
        ) : (
          <EmptyState
            title="No position"
            description="The loaded catalog does not currently expose coordinates for this object."
          />
        )}
      </section>
    </div>
  );
}


function ScienceSourcesPanel(
  props: {
    science:
      UniverseScienceView;
  },
) {
  if (
    props.science
      .sourceIds
      .length ===
    0
  ) {
    return (
      <EmptyState
        title="No provenance attached"
        description="No scientific source identifiers are currently attached to this object."
      />
    );
  }


  return (
    <div className="science-tab-content">
      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            PROVENANCE
          </small>

          <h3>
            Scientific sources
          </h3>
        </div>


        <div className="science-source-list">
          {props.science
            .sourceIds
            .map(
              (
                source,
                index,
              ) => (
                <article
                  key={
                    source
                  }
                >
                  <span className="science-source-index">
                    {
                      String(
                        index +
                        1,
                      ).padStart(
                        2,
                        "0",
                      )
                    }
                  </span>

                  <span className="science-source-copy">
                    <strong>
                      {
                        source
                      }
                    </strong>

                    <small>
                      Attached scientific provenance
                    </small>
                  </span>
                </article>
              ),
            )}
        </div>
      </section>


      <div className="science-information-note">
        UNIVERSE keeps observed, estimated, theoretical and procedural information conceptually separate. A source identifier indicates provenance, not unlimited measurement precision.
      </div>
    </div>
  );
}


function ScienceRendererPanel(
  props: {
    metrics:
      UniverseSessionMetrics;

    snapshot:
      UniverseSessionSnapshot;
  },
) {
  const renderer =
    props.metrics.renderer;


  return (
    <div className="science-tab-content">
      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            RENDERER
          </small>

          <h3>
            Live scene
          </h3>
        </div>


        <div className="science-metric-list">
          <MetricRow
            label="Backend"
            value={
              renderer.backend
            }
          />

          <MetricRow
            label="Frame time"
            value={`${renderer.frameMs.toFixed(
              2,
            )} ms`}
          />

          <MetricRow
            label="Draw calls"
            value={
              renderer.drawCalls.toLocaleString()
            }
          />

          <MetricRow
            label="Triangles"
            value={
              renderer.triangles.toLocaleString()
            }
          />

          <MetricRow
            label="Points"
            value={
              renderer.points.toLocaleString()
            }
          />

          <MetricRow
            label="Lines"
            value={
              renderer.lines.toLocaleString()
            }
          />

          <MetricRow
            label="Visible entities"
            value={
              renderer.visibleEntities.toLocaleString()
            }
          />
        </div>
      </section>


      <section className="science-content-section">
        <div className="science-section-heading">
          <small>
            ENGINE
          </small>

          <h3>
            Universe state
          </h3>
        </div>


        <div className="science-metric-list">
          <MetricRow
            label="Loaded entities"
            value={
              props.metrics
                .entityCount
                .toLocaleString()
            }
          />

          <MetricRow
            label="Scale band"
            value={
              titleCase(
                props.metrics
                  .scaleBand,
              )
            }
          />

          <MetricRow
            label="Meters per scene unit"
            value={
              props.metrics
                .scaleMetersPerUnit
                .toExponential(
                  3,
                )
            }
          />

          <MetricRow
            label="Reference frame"
            value={
              props.metrics
                .frameId
            }
          />

          <MetricRow
            label="Session revision"
            value={
              props.snapshot
                .revision
            }
          />
        </div>
      </section>
    </div>
  );
}


/* ============================================================
   CHECKPOINT 8
   Full Science drawer
   ============================================================ */


function ScienceDrawer(
  props: {
    object:
      UniverseObjectView;

    science:
      UniverseScienceView;

    session:
      UniverseSession;

    snapshot:
      UniverseSessionSnapshot;

    metrics:
      UniverseSessionMetrics;

    activeTab:
      ScienceTab;

    onTab(
      tab:
        ScienceTab,
    ): void;

    onClose():
      void;

    onTravel():
      void;
  },
) {
  let panel:
    React.ReactNode;


  switch (
    props.activeTab
  ) {
    case "overview":
      panel = (
        <ScienceOverviewPanel
          object={
            props.object
          }
          science={
            props.science
          }
          session={
            props.session
          }
        />
      );

      break;


    case "orbit":
      panel = (
        <ScienceOrbitPanel
          science={
            props.science
          }
          session={
            props.session
          }
        />
      );

      break;


    case "position":
      panel = (
        <SciencePositionPanel
          science={
            props.science
          }
          session={
            props.session
          }
        />
      );

      break;


    case "sources":
      panel = (
        <ScienceSourcesPanel
          science={
            props.science
          }
        />
      );

      break;


    case "renderer":
      panel = (
        <ScienceRendererPanel
          metrics={
            props.metrics
          }
          snapshot={
            props.snapshot
          }
        />
      );

      break;
  }


  return (
    <aside className="universe-science-drawer">
      <header className="science-drawer-header">
        <div className="science-drawer-object">
          <span
            className={classNames(
              "science-drawer-object-orb",

              `tone-${objectTone(
                props.object,
              )}`,
            )}
          >
            {
              objectGlyph(
                props.object,
              )
            }
          </span>


          <span>
            <small>
              SCIENCE MODE
            </small>

            <h2>
              {
                props.object.name
              }
            </h2>

            <p>
              {
                titleCase(
                  props.object.kind,
                )
              }
            </p>
          </span>
        </div>


        <div className="science-drawer-header-actions">
          <button
            type="button"
            onClick={
              props.onTravel
            }
          >
            Travel
          </button>

          <button
            type="button"
            className="science-close-button"
            aria-label="Close science mode"
            onClick={
              props.onClose
            }
          >
            ×
          </button>
        </div>
      </header>


      <nav className="science-tab-bar">
        {SCIENCE_TABS.map(
          tab => (
            <button
              type="button"
              key={
                tab.id
              }
              className={
                props.activeTab ===
                tab.id
                  ? "is-active"
                  : undefined
              }
              onClick={
                () =>
                  props.onTab(
                    tab.id,
                  )
              }
            >
              {
                tab.label
              }
            </button>
          ),
        )}
      </nav>


      <div className="science-drawer-scroll">
        {
          panel
        }
      </div>
    </aside>
  );
}


/* ============================================================
   CHECKPOINT 9
   Scale navigator
   ============================================================ */


function ScaleNavigator(
  props: {
    snapshot:
      UniverseSessionSnapshot;

    session:
      UniverseSession;
  },
) {
  const band =
    props.snapshot
      .state
      .scale
      .band;


  return (
    <div className="universe-scale-navigator">
      <button
        type="button"
        aria-label="Zoom inward one universe scale"
        title="Scale inward"
        onClick={
          () =>
            props.session.scaleIn()
        }
      >
        −
      </button>


      <div>
        <small>
          SCALE
        </small>

        <strong>
          {
            titleCase(
              band,
            )
          }
        </strong>
      </div>


      <button
        type="button"
        aria-label="Zoom outward one universe scale"
        title="Scale outward"
        onClick={
          () =>
            props.session.scaleOut()
        }
      >
        +
      </button>
    </div>
  );
}


/* ============================================================
   CHECKPOINT 10
   Main interface
   ============================================================ */


export const UniverseInterface =
  forwardRef<
    UniverseInterfaceHandle,
    UniverseInterfaceProps
  >(
    function UniverseInterface(
      props,
      ref,
    ) {
      const {
        session,
        snapshot,
      } =
        props;


      const searchInputRef =
        useRef<
          HTMLInputElement |
          null
        >(
          null,
        );


      const [
        search,
        setSearch,
      ] =
        useState<InterfaceSearchState>(
          () => ({
            ...EMPTY_SEARCH,

            query:
              snapshot
                .searchQuery,
          }),
        );


      const [
        catalogFilter,
        setCatalogFilter,
      ] =
        useState<CatalogFilter>(
          "all",
        );


      const [
        scienceTab,
        setScienceTab,
      ] =
        useState<ScienceTab>(
          "overview",
        );


      const [
        compactHud,
        setCompactHud,
      ] =
        useState(
          false,
        );


      const [
        controlsVisible,
        setControlsVisible,
      ] =
        useState(
          true,
        );


      /* === Phase 1: Exploration panels === */
      const [
        discoveryLogOpen,
        setDiscoveryLogOpen,
      ] =
        useState(false);

      const [
        waypointsOpen,
        setWaypointsOpen,
      ] =
        useState(false);

      const handleFlyToFromLog = useCallback(
        (entityId: string) => {
          (session as { flyToEntity?: (id: string) => void }).flyToEntity?.(entityId);
          setDiscoveryLogOpen(false);
        },
        [session],
      );

      const handleWaypointActivate = useCallback(
        (wp: { entityId?: string }) => {
          if (wp.entityId) {
            (session as { flyToEntity?: (id: string) => void }).flyToEntity?.(wp.entityId);
          }
          setWaypointsOpen(false);
        },
        [session],
      );


      const selected =
        snapshot.selected;


      const science =
        selected
          ? session.scienceFor(
              selected.id,
            )
          : null;


      const metrics =
        session.metrics();


      const searchResults =
        useMemo(
          () => {
            if (
              search.query
                .trim()
                .length ===
              0
            ) {
              return [];
            }


            return session.search(
              search.query,
              SEARCH_RESULT_LIMIT,
            );
          },

          [
            session,
            search.query,
            snapshot.revision,
          ],
        );


      const catalogSections =
        useMemo(
          () =>
            createCatalogSections(
              snapshot.objects,
              catalogFilter,
            ),

          [
            snapshot.objects,
            catalogFilter,
          ],
        );


      useEffect(
        () => {
          if (
            snapshot
              .searchQuery ===
            search.query
          ) {
            return;
          }


          setSearch(
            current => ({
              ...current,

              query:
                snapshot
                  .searchQuery,
            }),
          );
        },

        [
          snapshot.searchQuery,
        ],
      );


      useEffect(
        () => {
          if (
            snapshot.mode ===
            "explore"
          ) {
            setScienceTab(
              "overview",
            );
          }
        },

        [
          snapshot.mode,
          selected?.id,
        ],
      );


      const closeSearch =
        () => {
          setSearch(
            current => ({
              ...current,

              mode:
                "closed",

              activeIndex:
                0,
            }),
          );


          searchInputRef
            .current
            ?.blur();
        };


      const clearSearch =
        () => {
          session.clearSearch();


          setSearch({
            mode:
              "closed",

            query:
              "",

            activeIndex:
              0,
          });
        };


      const focusSearch =
        () => {
          setSearch(
            current => ({
              ...current,

              mode:
                current.query
                  .trim()
                  .length >
                0
                  ? "suggestions"
                  : "expanded",
            }),
          );


          requestAnimationFrame(
            () =>
              searchInputRef
                .current
                ?.focus(),
          );
        };


      const openCatalog =
        () => {
          session.setCatalogOpen(
            true,
          );


          closeSearch();
        };


      const openScience =
        () => {
          if (
            !selected
          ) {
            return;
          }


          session.setMode(
            "science",
          );


          setScienceTab(
            "overview",
          );


          closeSearch();
        };


      const closeTransientPanels =
        () => {
          closeSearch();


          session.setCatalogOpen(
            false,
          );


          if (
            snapshot.mode ===
            "science"
          ) {
            session.setMode(
              "explore",
            );
          }
        };


      useImperativeHandle(
        ref,

        () => ({
          focusSearch,

          openSearch:
            focusSearch,

          closeTransientPanels,

          openCatalog,

          openScience,
        }),

        [
          session,
          snapshot.mode,
          selected?.id,
        ],
      );


      const chooseObject =
        (
          id:
            EntityId,
        ) => {
          session.select(
            id,
          );


          if (
            window.matchMedia(
              "(max-width: 760px)",
            ).matches
          ) {
            session.setCatalogOpen(
              false,
            );
          }
        };


      const travelTo =
        (
          id:
            EntityId,
        ) => {
          session.travelTo(
            id,
          );


          closeSearch();


          session.setCatalogOpen(
            false,
          );
        };


      const selectSearchResult =
        (
          result:
            UniverseSearchResult |
            undefined,
        ) => {
          if (
            !result
          ) {
            return;
          }


          travelTo(
            result.entity.id,
          );


          clearSearch();
        };


      const updateSearch =
        (
          value:
            string,
        ) => {
          session.setSearchQuery(
            value,
          );


          setSearch(
            current => ({
              ...current,

              query:
                value,

              mode:
                value
                  .trim()
                  .length >
                0
                  ? "suggestions"
                  : "expanded",

              activeIndex:
                0,
            }),
          );
        };


      const handleSearchKeyDown =
        (
          event:
            React.KeyboardEvent<HTMLInputElement>,
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            event.preventDefault();


            if (
              search.query
                .length >
              0
            ) {
              clearSearch();
            } else {
              closeSearch();
            }


            return;
          }


          if (
            event.key ===
            "ArrowDown"
          ) {
            event.preventDefault();


            setSearch(
              current => ({
                ...current,

                activeIndex:
                  searchResults
                    .length ===
                  0
                    ? 0
                    : (
                        current.activeIndex +
                        1
                      ) %
                      searchResults.length,
              }),
            );


            return;
          }


          if (
            event.key ===
            "ArrowUp"
          ) {
            event.preventDefault();


            setSearch(
              current => ({
                ...current,

                activeIndex:
                  searchResults
                    .length ===
                  0
                    ? 0
                    : (
                        current.activeIndex -
                        1 +
                        searchResults.length
                      ) %
                      searchResults.length,
              }),
            );


            return;
          }


          if (
            event.key ===
            "Enter"
          ) {
            event.preventDefault();


            selectSearchResult(
              searchResults[
                search.activeIndex
              ],
            );
          }
        };


      const setMode =
        (
          mode:
            UniverseViewMode,
        ) => {
          session.setMode(
            mode,
          );


          if (
            mode ===
            "science"
          ) {
            setScienceTab(
              "overview",
            );
          }
        };


      const simulationDate =
        snapshot
          .simulationDate;


      const isReady =
        snapshot.status ===
        "ready";


      return (
        <div
          className={classNames(
            "universe-interface",

            compactHud &&
              "is-compact",

            snapshot.mode ===
              "science" &&
              "is-science-mode",
          )}
        >
          {/* ==================================================
              TOP NAVIGATION
              ================================================== */}


          <header className="universe-topbar">
            <button
              type="button"
              className="universe-brand"
              onClick={
                () =>
                  session.home()
              }
            >
              <span className="universe-brand-mark">
                <i className="brand-core" />

                <i className="brand-orbit brand-orbit-one" />

                <i className="brand-orbit brand-orbit-two" />
              </span>


              <span className="universe-brand-copy">
                <strong>
                  {
                    props.title ??
                    "UNIVERSE"
                  }
                </strong>

                <small>
                  {
                    props.subtitle ??
                    "Map of reality"
                  }
                </small>
              </span>
            </button>


            <div
              className={classNames(
                "universe-global-search",

                search.mode !==
                  "closed" &&
                  "is-open",
              )}
            >
              <span
                className="universe-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>


              <input
                ref={
                  searchInputRef
                }
                value={
                  search.query
                }
                placeholder="Search planets, stars, places and reality"
                aria-label="Search the universe"
                onFocus={
                  () =>
                    setSearch(
                      current => ({
                        ...current,

                        mode:
                          current.query
                            .trim()
                            .length >
                          0
                            ? "suggestions"
                            : "expanded",
                      }),
                    )
                }
                onChange={
                  event =>
                    updateSearch(
                      event
                        .target
                        .value,
                    )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
              />


              {search.query && (
                <button
                  type="button"
                  className="universe-search-clear"
                  aria-label="Clear search"
                  onClick={
                    clearSearch
                  }
                >
                  ×
                </button>
              )}


              {!search.query && (
                <kbd>
                  /
                </kbd>
              )}


              {search.mode !==
                "closed" && (
                <div className="universe-search-panel">
                  {search.query
                    .trim()
                    .length ===
                  0 ? (
                    <div className="universe-search-empty">
                      <small>
                        SEARCH REALITY
                      </small>

                      <h3>
                        Where do you want to go?
                      </h3>

                      <p>
                        Search the currently loaded scientific universe by name, type or description.
                      </p>


                      <div className="universe-search-suggestions">
                        {snapshot.objects
                          .slice(
                            0,
                            6,
                          )
                          .map(
                            object => (
                              <button
                                key={
                                  object.id
                                }
                                type="button"
                                onClick={
                                  () =>
                                    travelTo(
                                      object.id,
                                    )
                                }
                              >
                                <span
                                  className={classNames(
                                    "suggestion-orb",

                                    `tone-${objectTone(
                                      object,
                                    )}`,
                                  )}
                                >
                                  {
                                    objectGlyph(
                                      object,
                                    )
                                  }
                                </span>

                                <span>
                                  {
                                    object.name
                                  }
                                </span>
                              </button>
                            ),
                          )}
                      </div>
                    </div>
                  ) : searchResults
                      .length >
                    0 ? (
                    <div className="universe-search-results">
                      <div className="universe-search-results-heading">
                        <span>
                          {
                            searchResults.length
                          } result{
                            searchResults.length ===
                            1
                              ? ""
                              : "s"
                          }
                        </span>

                        <small>
                          Enter to travel
                        </small>
                      </div>


                      {searchResults.map(
                        (
                          result,
                          index,
                        ) => (
                          <SearchResultRow
                            key={
                              result.entity.id
                            }
                            result={
                              result
                            }
                            active={
                              search.activeIndex ===
                              index
                            }
                            session={
                              session
                            }
                            onTravel={
                              travelTo
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      title="Nothing found"
                      description="No currently loaded object matches that search."
                    />
                  )}
                </div>
              )}
            </div>


            <div className="universe-topbar-actions">
              <div className="universe-reality-indicator">
                <span className="reality-dot" />

                <span>
                  Reality
                </span>

                <small>
                  scientific
                </small>
              </div>


              <div className="universe-mode-switch">
                <button
                  type="button"
                  className={
                    snapshot.mode ===
                    "explore"
                      ? "is-active"
                      : undefined
                  }
                  onClick={
                    () =>
                      setMode(
                        "explore",
                      )
                  }
                >
                  Explore
                </button>

                <button
                  type="button"
                  className={
                    snapshot.mode ===
                    "science"
                      ? "is-active"
                      : undefined
                  }
                  disabled={
                    !selected
                  }
                  onClick={
                    () =>
                      setMode(
                        "science",
                      )
                  }
                >
                  Science
                </button>
              </div>
            </div>
          </header>


          {/* ==================================================
              LEFT ACTION RAIL
              ================================================== */}


          <nav className="universe-action-rail">
            <IconButton
              label="Catalog"
              icon="☷"
              active={
                snapshot.catalogOpen
              }
              onClick={
                () =>
                  session.toggleCatalog()
              }
            />

            <IconButton
              label="Search"
              icon="⌕"
              active={
                search.mode !==
                "closed"
              }
              onClick={
                focusSearch
              }
            />

            <span className="action-rail-divider" />

            <IconButton
              label="Solar System overview"
              icon="◎"
              onClick={
                () =>
                  session.home()
              }
            />

            <IconButton
              label="Toggle labels"
              icon="Aa"
              active={
                snapshot
                  .state
                  .overlays
                  .labels
              }
              onClick={
                () =>
                  session.toggleOverlay(
                    "labels",
                  )
              }
            />

            <IconButton
              label="Toggle orbit paths"
              icon="◌"
              active={
                snapshot
                  .state
                  .overlays
                  .orbits
              }
              onClick={
                () =>
                  session.toggleOverlay(
                    "orbits",
                  )
              }
            />

            <span className="action-rail-divider" />

            <IconButton
              label="Compact interface"
              icon={
                compactHud
                  ? "□"
                  : "▣"
              }
              active={
                compactHud
              }
              onClick={
                () =>
                  setCompactHud(
                    value =>
                      !value,
                  )
              }
            />

            <IconButton
              label="Control help"
              icon="?"
              active={
                controlsVisible
              }
              onClick={
                () =>
                  setControlsVisible(
                    value =>
                      !value,
                  )
              }
            />
          </nav>


          {/* ==================================================
              CATALOG DRAWER
              ================================================== */}


          <aside
            className={classNames(
              "universe-catalog-drawer",

              snapshot.catalogOpen &&
                "is-open",
            )}
          >
            <header className="catalog-drawer-header">
              <div>
                <small>
                  REALITY CATALOG
                </small>

                <h2>
                  Solar System
                </h2>

                <p>
                  {
                    snapshot.objects.length
                  } loaded objects
                </p>
              </div>


              <button
                type="button"
                aria-label="Close catalog"
                onClick={
                  () =>
                    session.setCatalogOpen(
                      false,
                    )
                }
              >
                ×
              </button>
            </header>


            <div className="catalog-filter-bar">
              {CATALOG_FILTERS.map(
                filter => (
                  <button
                    key={
                      filter.id
                    }
                    type="button"
                    className={
                      catalogFilter ===
                      filter.id
                        ? "is-active"
                        : undefined
                    }
                    onClick={
                      () =>
                        setCatalogFilter(
                          filter.id,
                        )
                    }
                  >
                    {
                      filter.label
                    }
                  </button>
                ),
              )}
            </div>


            <div className="catalog-drawer-scroll">
              {catalogSections.length >
              0 ? (
                catalogSections.map(
                  section => (
                    <section
                      key={
                        section.id
                      }
                      className="catalog-section"
                    >
                      <header>
                        <span>
                          {
                            section.label
                          }
                        </span>

                        <small>
                          {
                            section.objects.length
                          }
                        </small>
                      </header>


                      <div className="catalog-section-list">
                        {section.objects.map(
                          object => (
                            <CatalogObjectRow
                              key={
                                object.id
                              }
                              object={
                                object
                              }
                              session={
                                session
                              }
                              onSelect={
                                chooseObject
                              }
                              onTravel={
                                travelTo
                              }
                            />
                          ),
                        )}
                      </div>
                    </section>
                  ),
                )
              ) : (
                <EmptyState
                  title="Nothing in this category"
                  description="Try another catalog filter."
                />
              )}
            </div>
          </aside>


          {/* ==================================================
              SELECTED OBJECT
              ================================================== */}


          {selected &&
            snapshot.mode ===
              "explore" &&
            !compactHud && (
              <ExploreObjectCard
                object={
                  selected
                }
                session={
                  session
                }
                onTravel={
                  () =>
                    travelTo(
                      selected.id,
                    )
                }
                onScience={
                  openScience
                }
              />
            )}


          {/* ==================================================
              SCIENCE MODE
              ================================================== */}


          {selected &&
            science &&
            snapshot.mode ===
              "science" && (
              <ScienceDrawer
                object={
                  selected
                }
                science={
                  science
                }
                session={
                  session
                }
                snapshot={
                  snapshot
                }
                metrics={
                  metrics
                }
                activeTab={
                  scienceTab
                }
                onTab={
                  setScienceTab
                }
                onClose={
                  () =>
                    session.setMode(
                      "explore",
                    )
                }
                onTravel={
                  () =>
                    travelTo(
                      selected.id,
                    )
                }
              />
            )}


          {/* ==================================================
              BOTTOM HUD
              ================================================== */}


          <footer className="universe-bottom-hud">
            <div className="universe-bottom-left">
              <ScaleNavigator
                snapshot={
                  snapshot
                }
                session={
                  session
                }
              />


              <button
                type="button"
                className="universe-overview-button"
                onClick={
                  () =>
                    session.home()
                }
              >
                <span>
                  ◎
                </span>

                Overview
              </button>
            </div>


            <div className="universe-time-display">
              <span className="universe-time-live">
                <i />

                SIMULATION
              </span>

              <strong>
                {
                  simulationDate.toLocaleDateString(
                    undefined,
                    {
                      year:
                        "numeric",

                      month:
                        "short",

                      day:
                        "2-digit",
                    },
                  )
                }
              </strong>

              <span>
                {
                  simulationDate.toLocaleTimeString(
                    undefined,
                    {
                      hour:
                        "2-digit",

                      minute:
                        "2-digit",

                      second:
                        "2-digit",
                    },
                  )
                }
              </span>

              <small>
                ×
                {
                  snapshot
                    .state
                    .clock
                    .rate
                }
              </small>
            </div>


            <div className="universe-bottom-right">
              <button
                type="button"
                className={classNames(
                  "universe-overlay-toggle",

                  snapshot
                    .state
                    .overlays
                    .labels &&
                    "is-active",
                )}
                onClick={
                  () =>
                    session.toggleOverlay(
                      "labels",
                    )
                }
              >
                Labels
              </button>

              <button
                type="button"
                className={classNames(
                  "universe-overlay-toggle",

                  snapshot
                    .state
                    .overlays
                    .orbits &&
                    "is-active",
                )}
                onClick={
                  () =>
                    session.toggleOverlay(
                      "orbits",
                    )
                }
              >
                Orbits
              </button>
            </div>
          </footer>


          {/* ==================================================
              CONTROL GUIDE
              ================================================== */}


          {controlsVisible &&
            !compactHud && (
              <div className="universe-control-guide">
                <span>
                  <kbd>
                    Drag
                  </kbd>

                  orbit
                </span>

                <span>
                  <kbd>
                    Wheel
                  </kbd>

                  zoom
                </span>

                <span>
                  <kbd>
                    Double click
                  </kbd>

                  travel
                </span>

                <span>
                  <kbd>
                    WASD
                  </kbd>

                  fly
                </span>

                <span>
                  <kbd>
                    Q/E
                  </kbd>

                  vertical
                </span>

                <span>
                  <kbd>
                    Shift
                  </kbd>

                  boost
                </span>
              </div>
            )}


          {/* ==================================================
              PHASE 1: DISCOVERY + WAYPOINT PANELS
              ================================================== */}

          {discoveryLogOpen && (
            <DiscoveryPanel
              log={(session as { discoveryLog: Parameters<typeof DiscoveryPanel>[0]["log"] }).discoveryLog}
              onFlyTo={handleFlyToFromLog}
              onClose={() => setDiscoveryLogOpen(false)}
            />
          )}

          {waypointsOpen && (
            <WaypointPanel
              system={(session as { waypointSystem: Parameters<typeof WaypointPanel>[0]["system"] }).waypointSystem}
              onActivate={handleWaypointActivate}
              onClose={() => setWaypointsOpen(false)}
            />
          )}


          {/* ==================================================
              OPTIONAL DEBUG
              ================================================== */}


          {props.showDebugMetrics && (
            <aside className="universe-debug-metrics">
              <span>
                {
                  metrics.renderer
                    .frameMs
                    .toFixed(
                      1,
                    )
                } ms
              </span>

              <span>
                {
                  metrics.renderer
                    .drawCalls
                } draws
              </span>

              <span>
                {
                  metrics.entityCount
                } entities
              </span>

              <span>
                {
                  titleCase(
                    metrics.scaleBand,
                  )
                }
              </span>
            </aside>
          )}


          {/* ==================================================
              SESSION STATUS
              ================================================== */}


          {!isReady && (
            <div className="universe-session-status">
              <div className="universe-session-loader">
                <span className="session-loader-core" />

                <span className="session-loader-orbit session-loader-orbit-one" />

                <span className="session-loader-orbit session-loader-orbit-two" />
              </div>


              {snapshot.status ===
              "failed" ? (
                <>
                  <small>
                    UNIVERSE ERROR
                  </small>

                  <h2>
                    Reality could not be opened
                  </h2>

                  <p>
                    {
                      snapshot.error
                        ?.message ??
                      "Unknown initialization error."
                    }
                  </p>
                </>
              ) : (
                <>
                  <small>
                    UNIVERSE
                  </small>

                  <h2>
                    Opening reality
                  </h2>

                  <p>
                    {
                      titleCase(
                        snapshot.status,
                      )
                    }
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      );
    },
  );


UniverseInterface.displayName =
  "UniverseInterface";


/* ============================================================
   CHECKPOINT 11
   Interface information
   ============================================================ */


export function universeInterfaceInfo() {
  return {
    version:
      UNIVERSE_INTERFACE_VERSION,

    modes: [
      "explore",
      "science",
    ] as const,

    features: [
      "minimal-explore-hud",
      "global-reality-search",
      "ranked-search-results",
      "expandable-object-catalog",
      "selected-object-card",
      "cinematic-travel-actions",
      "science-overview",
      "orbital-elements",
      "scientific-position",
      "source-provenance",
      "renderer-diagnostics",
      "contextual-overlays",
      "scale-navigation",
      "simulation-time",
      "responsive-ui-foundation",
      "keyboard-search",
      "imperative-search-focus",
    ] as const,
  };
}