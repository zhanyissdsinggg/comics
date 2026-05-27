function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

const NARRATIVE_OVERRIDES = {
  "series-006": {
    1: [
      "The rain started at 2:11 a.m., thin as cassette tape and silver under the mag-rail. Aya kept one hand on the courier bike and the other over the paper envelope tucked inside her jacket, because nobody paid cash in Helix City unless the message mattered more than the law.",
      "Neon leaked across the flooded avenue in bruised pink and aquarium blue. Clubs were closing. Street kitchens were waking. Somewhere above the stacked apartments, a singer named Iona Vale had vanished between one encore and the blackout that swallowed three blocks of the Old Loop.",
      "Aya was supposed to deliver the envelope, take the credits, and keep moving. Instead she saw Iona's face on every emergency screen at once, frozen mid-note beneath the words MISSING AFTER INCIDENT AT THE GLASS ARCADE.",
      "At the next red light she checked the seal on the envelope. No address on the front. No sender. Only a hand-drawn crescent in silver ink, the same mark painted on the backstage door Iona had walked through an hour before she disappeared.",
      "By the time the signal turned green, Aya had already made the bad decision. She veered off the delivery lane, aimed the bike toward the Arcade district, and told herself she was only looking for a faster route. The lie bought her half a block.",
    ],
    2: [
      "The Glass Arcade smelled like ozone, expensive perfume, and old panic. Cleanup drones skated across the marble floor, polishing around a scorch mark shaped almost exactly like a body that had fallen and then been erased.",
      "A stagehand in a mirrored raincoat blocked Aya with a mop handle. He had bloodshot eyes and glitter still clinging to one cheek. 'If you're press, turn around,' he said. 'If you're police, you're late.'",
      "Aya showed him the envelope instead. The silver crescent changed his face more effectively than a weapon. He lowered the mop, glanced toward the silent stage, and whispered, 'Then she chose you too.'",
      "Behind the curtains the microphones were dead, but one dressing-room speaker kept humming with a low, stubborn feedback note. Under it, almost too soft to hear, Iona's rehearsal track replayed the final line she had sung before the blackout: find the door behind the wrong applause.",
      "Aya followed the sound to a mirrored wall that reflected the room correctly except for one missing detail. Her own jacket was there. The envelope was not. When she pressed the glass, a seam appeared in the silver and cold air breathed out from the dark.",
    ],
    3: [
      "The hidden stairwell dropped beneath the club and into the service arteries of the district, where the city's glamour gave way to humming pipes and cables wrapped in warning tape. Aya counted three levels before she saw the first speaker wired into the concrete like a shrine.",
      "Every speaker played a different fragment of Iona's voice. A laugh. A breath. One unfinished verse. Stitched together, they became a map, guiding her deeper until the corridor opened onto a rehearsal room no public blueprint admitted existed.",
      "Iona was there, alive, barefoot, and furious, standing beneath a rig of illegal resonance tech that could copy a singer's voice into a thousand synthetic ghosts. 'You should have delivered the envelope and walked away,' she said, though relief broke through the words a second later.",
      "Aya handed over the message. Inside was a single room key and a time: 3:40. Iona read it once and swore softly. 'They're not hiding me,' she said. 'They're preparing to debut me without me.'",
      "Above them, the club speakers roared back to life for the second show of the night. Iona looked up, heard her own voice being performed by machines, and reached for Aya's hand. 'If we miss that room before 3:40,' she said, 'the city will never know which version of me survived.'",
    ],
  },
  "series-011": {
    1: [
      "The first warning came as a color, not a sound. A pale ribbon of gold moved across the cockpit glass and painted the crew of the Solar Wind in a sunrise that belonged to no nearby star.",
      "Lena Ortiz had been on relay duty for eleven straight hours, nursing a freighter-class salvage ship through a dead corridor of satellites and forgotten military junk. She almost logged the glow as sensor drift until every loose screw in the console began to hum in the same key.",
      "Outside, the storm front unfurled over the station ring like a banner on fire. Charged dust scraped against the hull. Navigation buoys blinked out one by one. Somewhere in the static, a buried distress signal woke up and started repeating a call sign older than the charts.",
      "Captain Vale ordered the crew to keep course and leave the ghost transmission alone. The city below needed the reactor cores in their hold before dawn. But Lena watched the signal lock onto their ship, tighten, and pulse back in perfect rhythm with her own heartbeat.",
      "She answered it with one stolen touch on the console. The bridge lights went dark. In the black glass, a second ship appeared beside the Solar Wind, impossible and silent, keeping pace where there should have been only storm.",
    ],
    2: [
      "Emergency lamps snapped on in strips of red, turning the bridge into a submarine of shadows. Behind Lena, engineer Micah cursed from the ladder well and shouted that the guidance spool had rebooted itself with coordinates nobody had entered.",
      "The phantom ship remained on the glass, not on the scanners. It was visible only when the storm flashed. Each time lightning licked through the dust, another detail appeared: a broken antenna, scorched plating, a name along the bow sanded away by time.",
      "Captain Vale wanted the crew strapped down and silent. Lena wanted to know why a distress call from a vanished patrol ship knew the Solar Wind by registry number. When the same signal pushed a burst of code through the dead comm array, curiosity won.",
      "The decoded packet was only three words long: DO NOT DOCK BELOW. Nothing else. No source stamp. No timestamp. Just the kind of warning that arrives too late to be comforting.",
      "Then the city station answered the storm with a docking clearance they had never requested. Bay Seven opened like a mouth beneath them, bright, welcoming, and very obviously powered by a grid that should have failed ten years ago.",
    ],
    3: [
      "The Solar Wind settled into Bay Seven on magnetic clamps that hit too hard, as if the station were afraid they might change their minds. No harbor crew came out to meet them. No customs drones. Only clean white lights and a corridor so polished it reflected the ship like a confession.",
      "Micah found frost on the inside of the cargo hatch. Captain Vale found the station clock frozen at 04:17, the exact minute the ghost distress call had first gone dark in the archives. Lena found footprints in the docking dust leading away from their ramp before anyone on her crew had stepped outside.",
      "They followed the prints into the station market, past sealed stalls and tables still set for meals that had never been eaten. Every screen in the concourse showed the same public service notice in six languages: SHELTER IN PLACE UNTIL THE FLARE PASSES.",
      "At the center rotunda, a boy in an oversized station coat waited beside a maintenance cart, as though he had been told precisely when they would arrive. He looked at Lena, then at the sealed reactor cores in the cargo manifest, and said, 'You took too long. The city has already chosen who goes dark first.'",
      "Before anyone could question him, the floor beneath the rotunda lights flickered transparent. Far below the station's polished streets, another city hung upside down in the storm, hidden in the superstructure like a second heart.",
    ],
  },
};

export function resolveReaderNarrativeParagraphs({
  seriesId = "",
  episodeNumber = 0,
  paragraphs = [],
}) {
  const normalizedSeriesId = normalizeValue(seriesId);
  const normalizedEpisodeNumber = Number(episodeNumber || 0);
  const override =
    NARRATIVE_OVERRIDES?.[normalizedSeriesId]?.[normalizedEpisodeNumber];

  if (Array.isArray(override) && override.length > 0) {
    return override;
  }

  return (Array.isArray(paragraphs) ? paragraphs : [])
    .map((paragraph) => String(paragraph || "").trim())
    .filter(Boolean);
}
