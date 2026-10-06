# Hansa — source-based design brief

Proposal 27. Source reviewed 2026-09-30: [Hansa instructions](http://daviddfriedman.com/Living_Paper/Hansa/hansa_instructions/hansa_instructions.htm) and [Living Paper index](http://daviddfriedman.com/Living_Paper/living_paper.htm).

**This is a source-based brief.** Eric selected and implemented a small browser adaptation on 2026-10-02; [SPECIFICATION.md](SPECIFICATION.md) records the approved choices and invites David's review. Verified v1 is frozen pending feedback; source mechanics below remain distinct from browser adaptations.

## Learning objective

Build a trading league through comparative advantage and mutual gains rather than conquest.

## Confirmed mechanics in the source

- Each city has labor, good-specific production costs, and utility from consumption. The best utility attainable without trade defines its autarky baseline.
- Allocate labor to production, transportation, and trade missions. Exporting cities provide transport labor; transport costs depend on routes and are lower by water than by land.
- Goods are consumed within a turn rather than stored. Consumption equals production plus imports minus exports, and trade occurs within a league.
- Cities can join or leave a league according to its benefits. Membership incentives depend on gains above autarky; invitations can include a utility guarantee.
- The instructions propose cumulative gains above autarky or league expansion as scoring objectives, with solitaire and competing-league variants.
- The legacy instructions discuss versions 0.6 and 0.8, including prototype limitations and a later computer player. The index advertises a v0.84 archive; no current runtime or feature parity has been verified.

## Optional variants and adaptation notes

- Competing human or computer leagues, fog of war, random maps, historical maps, alternate scoring rules, and interface enhancements need explicit browser scope choices.
- Distinguish planned league-wide invitation calculations from the simpler city-to-city calculation described for an earlier prototype.

## Source questions and browser decisions

Questions 1–3 below were resolved for Eric's browser v1 in SPECIFICATION.md; David's review is invited. They remain useful when considering closer historical fidelity. No reuse permissions have been inferred.

1. What production and utility functions, route costs, and membership probabilities should define the browser model?
2. Which map, goods, initial cities, and victory rule should the first version use?
3. Does David want a small solitaire teaching activity first or a full strategy-game adaptation?
4. Which parts of Tom Courtney's and Mikel Evins' contributions may be reused and under what terms?

## Source and accessibility constraints

The index credits Tom Courtney's substantial work on Hansa, links source and Macintosh archives, and mentions Mikel Evins' Java rewrite. Preserve these credits; archives and the linked rewrite have not been inspected. [Legacy archive link](http://daviddfriedman.com/Living_Paper/hansa.sit); recorded from the index, not inspected.

Write fresh browser code by default; follow source-use notes (in the authoring collection) before any reuse. Keep keyboard and single-pointer alternatives for drawing/dragging, labeled numeric data and text/table equivalents for visual output, and verified focus/reflow behavior. These adaptation requirements do not imply that the original desktop UI meets current accessibility standards.

## Next task

Retain the verified v1 freeze. When the user supplies David's review instructions, prepare the prototype in his chosen format; incorporate feedback before release auditing. SPECIFICATION.md defines the browser model and tests; VERIFICATION.md (in the authoring collection) records measured evidence and limitations.
