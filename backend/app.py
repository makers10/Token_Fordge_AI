import json
import tiktoken
from flask import Flask, request, jsonify
from flask_cors import CORS
import difflib

app = Flask(__name__)
CORS(app)

# Default encoding for GPT-4o
DEFAULT_ENCODING = "cl100k_base"

def count_tokens(text, model="gpt-4o"):
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding(DEFAULT_ENCODING)
    
    tokens = encoding.encode(text)
    return len(tokens), tokens

def json_to_toon(data):
    """
    Token-Oriented Object Notation (TOON) Converter.
    Minimizes JSON overhead by extracting schema and deduplicating keys.
    Format: #[key1,key2]{val1|val2}{val1|val2}
    """
    if not isinstance(data, list) or not data:
        return json.dumps(data, separators=(',', ':'))

    # Extract all unique keys from the list of dicts
    keys = []
    for item in data:
        if isinstance(item, dict):
            for k in item.keys():
                if k not in keys:
                    keys.append(k)
    
    header = f"#[{','.join(keys)}]"
    rows = []
    for item in data:
        if isinstance(item, dict):
            row_vals = [str(item.get(k, "")) for k in keys]
            rows.append(f"{{{ '|'.join(row_vals) }}}")
        else:
            rows.append(f"{{{str(item)}}}")
    
    return header + "".join(rows)

def compact_prompt(text):
    """Simple NLP-based prompt compression."""
    # This is a basic demonstration. A real-world version would use a more 
    # sophisticated NLP approach or a specialized small LLM for compression.
    redundant_words = ["please", "can you", "i would like to", "could you", "the purpose of this is to"]
    compressed = text
    for word in redundant_words:
        compressed = compressed.replace(word, "")
        compressed = compressed.replace(word.capitalize(), "")
    
    # Remove extra whitespace
    compressed = " ".join(compressed.split())
    return compressed

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')
    model = data.get('model', 'gpt-4o')
    
    token_count, tokens = count_tokens(text, model)
    
    # Simple heatmap visualization: group tokens into 10-token chunks for coloring
    # In a real UI, we'd send the actual tokens and leur 'cost' weight.
    
    return jsonify({
        "token_count": token_count,
        "estimated_cost": round(token_count * (0.01 / 1000), 5), # Assume $0.01 per 1K tokens for avg
        "context_window_usage": round((token_count / 128000) * 100, 2),
        "tokens": tokens
    })

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    text = data.get('text', '')
    mode = data.get('mode', 'auto') # auto, toon, minified, prompt
    
    original_tokens, _ = count_tokens(text)
    
    try:
        json_data = json.loads(text)
        is_json = True
    except:
        is_json = False
    
    optimized_text = text
    if mode == 'toon' and is_json:
        optimized_text = json_to_toon(json_data)
    elif mode == 'minified' and is_json:
        optimized_text = json.dumps(json_data, separators=(',', ':'))
    elif mode == 'prompt' or (mode == 'auto' and not is_json):
        optimized_text = compact_prompt(text)
    elif mode == 'auto' and is_json:
        # Detect if it's an array for TOON or just an object
        if isinstance(json_data, list):
            optimized_text = json_to_toon(json_data)
        else:
            optimized_text = json.dumps(json_data, separators=(',', ':'))

    optimized_tokens, _ = count_tokens(optimized_text)
    reduction = ((original_tokens - optimized_tokens) / original_tokens * 100) if original_tokens > 0 else 0
    
    return jsonify({
        "original_tokens": original_tokens,
        "optimized_tokens": optimized_tokens,
        "optimized_text": optimized_text,
        "percent_reduction": round(reduction, 2)
    })

@app.route('/validate', methods=['POST'])
def validate():
    data = request.json
    original_output = data.get('original_output', '')
    optimized_output = data.get('optimized_output', '')
    
    # Basic similarity score using SequenceMatcher
    similarity = difflib.SequenceMatcher(None, original_output, optimized_output).ratio()
    
    return jsonify({
        "similarity_score": round(similarity * 100, 2),
        "status": "Success" if similarity > 0.8 else "Warning: Accuracy drop"
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
