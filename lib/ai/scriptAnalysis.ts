// Script Analysis NLP Pipeline for extracting character information and dialogue
import { embeddingsService } from './embeddings';
import { vectorStore } from './vectorStore';

interface Character {
  name: string;
  description: string;
  traits: string[];
  dialogueCount: number;
  importance: 'lead' | 'supporting' | 'minor';
  scenes: number[];
}

interface ScriptAnalysisResult {
  title: string;
  genre: string[];
  setting: string;
  characters: Character[];
  themes: string[];
  totalScenes: number;
  estimatedDuration: number;
}

export class ScriptAnalyzer {
  private patterns = {
    character: /^[A-Z][A-Z\s]+(?:\s\([^)]+\))?$/m,
    dialogue: /^[A-Z][A-Z\s]+\n(.+?)(?=\n\n|[A-Z][A-Z\s]+:|$)/gms,
    sceneHeading: /^(INT\.|EXT\.|INT\/EXT\.).+$/gm,
    action: /^[A-Z].*[a-z].*\.$/gm,
    parenthetical: /\([^)]+\)/g,
    transition: /^(FADE IN:|FADE OUT|CUT TO:|DISSOLVE TO:).*$/gm
  };

  constructor() {
    console.log('✅ Script Analysis NLP Pipeline initialized');
  }

  // Main analysis function
  async analyzeScript(scriptText: string): Promise<ScriptAnalysisResult> {
    const characters = this.extractCharacters(scriptText);
    const scenes = this.extractScenes(scriptText);
    const genre = this.detectGenre(scriptText);
    const themes = this.extractThemes(scriptText);
    const setting = this.extractSetting(scriptText);
    
    // Store character profiles in vector store for matching
    await this.storeCharacterProfiles(characters);

    return {
      title: this.extractTitle(scriptText),
      genre,
      setting,
      characters,
      themes,
      totalScenes: scenes.length,
      estimatedDuration: Math.round(scriptText.length / 150) // Rough estimate: 150 chars per minute
    };
  }

  // Extract characters from script
  private extractCharacters(script: string): Character[] {
    const charactersMap = new Map<string, Character>();
    const dialogueMatches = script.matchAll(this.patterns.dialogue);
    
    for (const match of dialogueMatches) {
      const characterName = match[0].split('\n')[0].trim();
      const dialogue = match[1];
      
      if (!charactersMap.has(characterName)) {
        charactersMap.set(characterName, {
          name: characterName,
          description: '',
          traits: [],
          dialogueCount: 0,
          importance: 'minor',
          scenes: []
        });
      }
      
      const character = charactersMap.get(characterName)!;
      character.dialogueCount++;
      
      // Extract traits from dialogue patterns
      if (dialogue.length > 50) {
        character.traits = this.analyzeDialogueTraits(dialogue);
      }
    }

    // Determine character importance
    const characters = Array.from(charactersMap.values());
    characters.forEach(char => {
      if (char.dialogueCount > 50) char.importance = 'lead';
      else if (char.dialogueCount > 20) char.importance = 'supporting';
    });

    return characters;
  }

  // Extract scenes from script
  private extractScenes(script: string): string[] {
    const sceneHeadings = script.match(this.patterns.sceneHeading) || [];
    return sceneHeadings;
  }

  // Detect genre based on keywords
  private detectGenre(script: string): string[] {
    const genres: string[] = [];
    const scriptLower = script.toLowerCase();
    
    const genreKeywords = {
      action: ['fight', 'explosion', 'chase', 'gun', 'battle'],
      comedy: ['laugh', 'joke', 'funny', 'humor', 'hilarious'],
      drama: ['emotion', 'tears', 'conflict', 'relationship', 'struggle'],
      thriller: ['suspense', 'tension', 'mystery', 'danger', 'fear'],
      romance: ['love', 'kiss', 'heart', 'romance', 'passion'],
      scifi: ['space', 'alien', 'future', 'technology', 'robot']
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      const count = keywords.filter(kw => scriptLower.includes(kw)).length;
      if (count >= 2) genres.push(genre);
    }

    return genres.length > 0 ? genres : ['drama'];
  }

  // Extract themes
  private extractThemes(script: string): string[] {
    const themes: string[] = [];
    const scriptLower = script.toLowerCase();
    
    const themeKeywords = {
      'family': ['family', 'mother', 'father', 'daughter', 'son'],
      'redemption': ['forgive', 'redemption', 'second chance', 'mistake'],
      'sacrifice': ['sacrifice', 'give up', 'for others', 'selfless'],
      'justice': ['justice', 'right', 'wrong', 'law', 'fair'],
      'survival': ['survive', 'alive', 'death', 'danger', 'escape']
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const count = keywords.filter(kw => scriptLower.includes(kw)).length;
      if (count >= 2) themes.push(theme);
    }

    return themes;
  }

  // Extract setting
  private extractSetting(script: string): string {
    const sceneHeadings = script.match(this.patterns.sceneHeading) || [];
    if (sceneHeadings.length > 0) {
      // Extract location from first scene heading
      const firstScene = sceneHeadings[0];
      const locationMatch = firstScene.match(/(?:INT\.|EXT\.|INT\/EXT\.)\s*(.+?)(?:\s*-|$)/);
      return locationMatch ? locationMatch[1].trim() : 'Unknown';
    }
    return 'Unknown';
  }

  // Extract title (usually at the beginning)
  private extractTitle(script: string): string {
    const lines = script.split('\n');
    for (const line of lines.slice(0, 10)) {
      if (line.trim().length > 0 && !line.includes('FADE IN')) {
        return line.trim();
      }
    }
    return 'Untitled Script';
  }

  // Analyze dialogue to extract character traits
  private analyzeDialogueTraits(dialogue: string): string[] {
    const traits: string[] = [];
    const dialogueLower = dialogue.toLowerCase();
    
    if (dialogueLower.includes('!') || dialogueLower.includes('angry')) {
      traits.push('intense');
    }
    if (dialogueLower.includes('?') && dialogueLower.length < 50) {
      traits.push('inquisitive');
    }
    if (dialogueLower.includes('love') || dialogueLower.includes('care')) {
      traits.push('caring');
    }
    if (dialogueLower.includes('sorry') || dialogueLower.includes('apologize')) {
      traits.push('remorseful');
    }
    if (dialogueLower.match(/\b(i think|maybe|perhaps|possibly)\b/)) {
      traits.push('thoughtful');
    }
    
    return traits;
  }

  // Store character profiles in vector store for matching
  private async storeCharacterProfiles(characters: Character[]): Promise<void> {
    const documents = characters.map(char => ({
      id: `character_${char.name.toLowerCase().replace(/\s/g, '_')}`,
      text: `${char.name} ${char.importance} character with traits: ${char.traits.join(', ')}. 
             Appears in ${char.dialogueCount} dialogues.`,
      metadata: {
        name: char.name,
        importance: char.importance,
        dialogueCount: char.dialogueCount,
        traits: char.traits
      }
    }));

    await vectorStore.upsert(documents);
    console.log(`✅ Stored ${characters.length} character profiles in vector store`);
  }

  // Match actors to characters using semantic similarity
  async matchActorsToCharacters(
    characters: Character[],
    actorProfiles: Array<{id: string; profile: string}>
  ): Promise<Map<string, Array<{actorId: string; score: number}>>> {
    const matches = new Map<string, Array<{actorId: string; score: number}>>();
    
    for (const character of characters) {
      const characterProfile = `${character.importance} character ${character.name} with traits: ${character.traits.join(', ')}`;
      const actorMatches: Array<{actorId: string; score: number}> = [];
      
      for (const actor of actorProfiles) {
        const similarity = await this.calculateSimilarity(characterProfile, actor.profile);
        actorMatches.push({ actorId: actor.id, score: similarity });
      }
      
      // Sort by score and take top matches
      actorMatches.sort((a, b) => b.score - a.score);
      matches.set(character.name, actorMatches.slice(0, 5));
    }
    
    return matches;
  }

  // Calculate similarity between character and actor
  private async calculateSimilarity(characterProfile: string, actorProfile: string): Promise<number> {
    const charEmbedding = await embeddingsService.generateEmbedding(characterProfile);
    const actorEmbedding = await embeddingsService.generateEmbedding(actorProfile);
    
    return embeddingsService.cosineSimilarity(charEmbedding, actorEmbedding);
  }

  // Extract dialogue snippets for audition
  extractAuditionDialogue(script: string, characterName: string, maxLines: number = 10): string[] {
    const dialogues: string[] = [];
    const pattern = new RegExp(`^${characterName}\\s*\\n(.+?)(?=\\n\\n|[A-Z][A-Z\\s]+:|$)`, 'gms');
    const matches = script.matchAll(pattern);
    
    for (const match of matches) {
      dialogues.push(match[1].trim());
      if (dialogues.length >= maxLines) break;
    }
    
    return dialogues;
  }
}

// Export singleton instance
export const scriptAnalyzer = new ScriptAnalyzer();