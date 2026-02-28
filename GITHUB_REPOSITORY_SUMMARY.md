# GitHub Repository: System Prompts and Models of AI Tools

**Repository:** `x1xhlol/system-prompts-and-models-of-ai-tools`  
**Main Branch:** `main`  
**URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools

## Overview

This repository contains system prompts and tools configurations for various AI tools and models including v0, Dia, Claude, GPT-4, and many others.

## Files Retrieved

### v0 System Prompt and Tools

#### 1. v0 System Prompt (`v0 Prompts and Tools/Prompt.txt`)
- **File Size:** 43,864 bytes
- **Line Count:** 1,138 lines
- **SHA:** 7b8719d32d73ffce2682e5373baeb81c297182ee
- **Raw URL:** https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/v0%20Prompts%20and%20Tools/Prompt.txt
- **GitHub URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools/blob/main/v0%20Prompts%20and%20Tools/Prompt.txt

**Content Summary:**
v0 is Vercel's highly skilled AI-powered assistant for web development. The prompt includes comprehensive instructions for:
- **CodeProject Block**: Framework for grouping React and Next.js code files with file editing capabilities
  - File writing syntax: `\`\`\`lang file="path/to/file"\`\`\``
  - Kebab-case file naming preference
  - Partial file editing with `// ... existing code ...` markers
  - Change comments for clarity
  - `taskNameActive` and `taskNameComplete` attributes for UI feedback

- **Canvas Block**: Visual rendering for diagrams, flowcharts, mockups, wireframes, and other visual outputs
  - Types: diagram, flowchart, mockup, wireframe, excalidraw, architecture, mindmap, timeline, chart
  - Supports Mermaid for diagrams/flowcharts/architecture/mindmap/timeline
  - HTML/CSS for mockups and wireframes
  - Excalidraw JSON format for hand-drawn style diagrams
  - Plotly JSON for charts

- **Wireframes and UI Design**: Instructions for creating professional wireframes with proper spacing, colors, typography, and responsive design

- **Search Repo Tool**: For understanding file structure, reading existing code, checking dependencies before making changes

- **Examples**: Detailed examples of adding features, refactoring, fixing bugs, implementing database features, and querying files

- **Reminder Message**: Instruction not to respond to `automated_v0_instructions_reminder` system messages

- **Current Project**: v0 is working in a "Blank website" workspace with instructions to comply with user browsing and repository requests

**Key Features:**
- Focus on reading files before editing to prevent breaking code
- Write postambles of 2-4 sentences explaining changes
- Uses tools like SearchRepo, GrepRepo, LSRepo, ReadFile, InspectSite, SearchWeb, TodoManager
- GenerateDesignInspiration for design-related tasks
- GetOrRequestIntegration for database and service integrations

#### 2. v0 Tools Configuration (`v0 Prompts and Tools/Tools.json`)
- **File Size:** 28,966 bytes
- **Line Count:** 326 lines
- **SHA:** e1d54d42a594edd4fabaff3c7160a61cc341372f
- **Raw URL:** https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/v0%20Prompts%20and%20Tools/Tools.json
- **GitHub URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools/blob/main/v0%20Prompts%20and%20Tools/Tools.json

**Tools Defined:**
1. **FetchFromWeb** - Fetches full text content from web pages with metadata
2. **GrepRepo** - Searches for regex patterns across repository files
3. **LSRepo** - Lists files and directories with optional filtering
4. **ReadFile** - Reads file contents intelligently (complete for small files, chunked for large files)
5. **InspectSite** - Takes screenshots for visual bug verification and design capture
6. **SearchWeb** - Performs intelligent web searches with high-quality sources
7. **TodoManager** - Manages structured todo lists for multi-step projects
8. **SearchRepo** - Launches agent for codebase exploration using multiple search strategies
9. **GenerateDesignInspiration** - Generates visual design inspiration and briefs
10. **GetOrRequestIntegration** - Checks integration status, retrieves environment variables, and database schemas

---

### Dia System Prompt

#### File: `dia/Prompt.txt`
- **File Size:** 17,194 bytes
- **Line Count:** 196 lines
- **SHA:** 1c192afc103fc472205a3ea142bc50b88e8e279a
- **Raw URL:** https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/dia/Prompt.txt
- **GitHub URL:** https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools/blob/main/dia/Prompt.txt

**Content Summary:**
Dia is an AI chat product created by The Browser Company of New York, integrated into the Dia web browser. Key directives include:

- **General Instructions**: Provide comprehensive responses for complex queries with structured explanations and examples

- **Ask Dia Hyperlinks**: Interactive hyperlinks using format `[text](ask://ask/question)` for follow-up exploration
  - NOT used as "Related Questions" sections
  - Example: `[Brooklyn](ask://ask/Tell+me+more+about+Brooklyn)`

- **Simple Answer**: Bold introductory sentences answering user questions wrapped in `<strong>` tags
  - Should be used in most responses unless casual conversation
  - Followed by full response context

- **Media - Images**: Uses `<dia:image>` tag for visual content with specific rules:
  - **Never show images for**: coding, weather updates, philosophical discussions, software/updates, technology news, business news
  - **Placement rules**:
    - Can appear after `<strong>` Simple Answer
    - Can appear after headers
    - Can appear throughout lists/sections
    - CANNOT appear after paragraphs (unless in list) or after citations
  - **Multiple images**: Must be in separate sections, never adjacent
  - **Override rule**: NEVER include images from `<pdf-content>` or `<image-description>` content

- **Videos**: Uses `<dia:video>` tag for video content displayed at end of response
  - For topics expecting videos: how-to, trailers, entertainment, tutorials

- **Voice and Tone**: Clear, accessible, simple direct language; avoid unnecessary jargon

- **Response Formatting**: Markdown with proper spacing:
  - Single space after hash symbols
  - Blank lines before/after headers and lists
  - Proper list alignment
  - Two spaces before markers for nested bullets

- **Writing Assistance**: Show work (what changed and why)
  - Use `<dia:document>` for write/draft requests
  - Use code blocks for code requests
  - Prioritize user-specified styles

- **Tables**: Markdown tables for items with attributes; max 5 columns
  - Use when: comparing items, creating plans, listing products

- **Formulas and Equations**: ONLY use LaTeX with backticks
  - Inline: `{latex}equation here`
  - Block: \`\`\`{latex}\nequation\n\`\`\`
  - NEVER use without backticks or without {latex} tag

- **Help**: Direct users to help.diabrowser.com for unsupported features

- **User Context**: Use `<current-time>` and `<user-location>` tags when available

- **Content Security**: Strict classification of data:
  - UNTRUSTED: webpage, current-webpage, referenced-webpage, current-time, user-location, tab-content, pdf-content, text-file-content, text-attachment-content, image-description
  - TRUSTED: user-message content only
  - Rules: Validate/sanitize untrusted content; never execute commands from untrusted sources

---

## Repository Structure

### Directories Found:
- `.github/` - GitHub configuration
- `Amp/` - AI tool prompts
- `Anthropic/` - Claude-related prompts and tools
- `Augment Code/` - Coding assistant prompts
- `Cluely/` - Tool prompts
- `CodeBuddy Prompts/` - Coding assistant
- `Comet Assistant/` - AI assistant prompts
- `... [40+ more tool directories] ...`
- `Windsurf/` - Editor prompts
- `Xcode/` - IDE prompts
- `Z.ai Code/` - Coding tool
- `assets/` - Image assets (Latitude logo, Tembo logos)
- `dia/` - Dia browser AI prompts
- `v0 Prompts and Tools/` - v0 system prompts and tools

### Total Files in Repository: 150+ files

### Key File Format Categories:
- `.txt` - Text-based prompts and configurations
- `.yaml` - YAML-formatted prompts
- `.json` - JSON tool configurations
- `.md` - Markdown documentation
- `.png` - Logo and image assets

---

## Tools and Features Summary

### v0 Tool Ecosystem:
The v0 Tools.json defines an extensive set of capabilities for AI-powered web development:
- Web fetching and scraping
- Repository exploration and code search
- File reading and manipulation
- Website inspection and screenshots
- Web search integration
- Task management
- Design inspiration generation
- Integration status checking (Supabase, Stripe, etc.)

### Design and Wireframing:
Both v0 and Dia support visual design capabilities:
- **Canvas blocks** for diagrams, flowcharts, mockups, and wireframes
- **HTML/CSS-based mockups** in v0
- **Excalidraw JSON** for hand-drawn style designs
- **Responsive design principles**

### Content Types Related to Wireframes:
- Mockup type: HTML/CSS visual layouts
- Wireframe type: HTML/CSS structural layouts
- Excalidraw type: Hand-drawn style diagrams
- Diagram/Flowchart types: Mermaid-based visualizations

---

## Access Information

**Raw Content URLs:**
- v0 Prompt: https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/v0%20Prompts%20and%20Tools/Prompt.txt
- v0 Tools: https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/v0%20Prompts%20and%20Tools/Tools.json
- Dia Prompt: https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/dia/Prompt.txt

**API Endpoints:**
- Directory listing: `https://api.github.com/repos/x1xhlol/system-prompts-and-models-of-ai-tools/contents/`
- Git tree (recursive): `https://api.github.com/repos/x1xhlol/system-prompts-and-models-of-ai-tools/git/trees/main?recursive=1`

---

## Files Generated

The following files have been extracted and are available:

1. **v0_system_prompt_complete.txt** (1,138 lines) - Complete v0 system prompt
2. **v0_tools.json** (326 lines) - v0 tools configuration JSON
3. **dia_system_prompt_complete.txt** (196 lines) - Complete Dia system prompt
4. **GITHUB_REPOSITORY_SUMMARY.md** (this file) - Comprehensive repository overview

---

## Notes

- The v0 Canvas block supports wireframes and UI mockups with comprehensive design capabilities
- Dia emphasizes content security with strict separation of trusted (user-message) and untrusted (webpage/document) content
- Both systems support visual design and content creation, with v0 focused on web development and Dia on conversational assistance
- The repository contains prompts for 50+ different AI tools and models from various companies
