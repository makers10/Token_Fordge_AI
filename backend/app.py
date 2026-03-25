import json
import tiktoken
import requests
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
    
    token_ids = encoding.encode(text)
    tokens = [encoding.decode([t]) for t in token_ids]
    return len(token_ids), tokens

def json_to_toon(data):
    if not isinstance(data, list) or not data:
        return json.dumps(data, separators=(',', ':'))
    keys = []
    for item in data:
        if isinstance(item, dict):
            for k in item.keys():
                if k not in keys: keys.append(k)
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
    redundant_words = ["please", "can you", "i would like to", "could you", "the purpose of this is to"]
    compressed = text
    for word in redundant_words:
        compressed = compressed.replace(word, "").replace(word.capitalize(), "")
    return " ".join(compressed.split())

MODEL_PRICING = {
    "gpt-4o": 0.005,
    "claude-3-opus": 0.015,
    "gemini-1.5-pro": 0.007,
    "deepseek-v3": 0.00014,
    "nvidia-llama-3-70b": 0.0009,
    "openrouter-auto": 0.002
}

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')
    model = data.get('model', 'gpt-4o')
    token_count, tokens = count_tokens(text, model)
    costs = [{"model": m, "cost": round(token_count * (price/1000), 6)} for m, price in MODEL_PRICING.items()]
    return jsonify({
        "token_count": token_count,
        "estimated_cost": round(token_count * (MODEL_PRICING.get(model, 0.005) / 1000), 6),
        "context_window_usage": round((token_count / 128000) * 100, 2),
        "tokens": tokens,
        "multi_model_costs": costs
    })

@app.route('/optimize', methods=['POST'])
def optimize():
    data = request.json
    text = data.get('text', '')
    mode = data.get('mode', 'auto')
    original_tokens, _ = count_tokens(text)
    try:
        json_data = json.loads(text)
        is_json = True
    except: is_json = False
    
    optimized_text = text
    if mode == 'toon' and is_json: optimized_text = json_to_toon(json_data)
    elif mode == 'minified' and is_json: optimized_text = json.dumps(json_data, separators=(',', ':'))
    elif mode == 'prompt' or (mode == 'auto' and not is_json): optimized_text = compact_prompt(text)
    elif mode == 'auto' and is_json:
        if isinstance(json_data, list): optimized_text = json_to_toon(json_data)
        else: optimized_text = json.dumps(json_data, separators=(',', ':'))

    optimized_tokens, _ = count_tokens(optimized_text)
    reduction = ((original_tokens - optimized_tokens) / original_tokens * 100) if original_tokens > 0 else 0
    return jsonify({
        "original_tokens": original_tokens,
        "optimized_tokens": optimized_tokens,
        "optimized_text": optimized_text,
        "percent_reduction": round(reduction, 2)
    })

@app.route('/ai-optimize', methods=['POST'])
def ai_optimize():
    data = request.json
    text, api_key, provider = data.get('text', ''), data.get('api_key', ''), data.get('provider', 'OpenRouter')
    if not api_key: return jsonify({"error": "Missing API Key"}), 400
    
    sys_prompt = "Rewrite the following text for maximum token-efficiency. Remove bloat, maintain 100% data. Return ONLY optimized text."
    
    try:
        if provider == 'OpenAI':
            url, headers = "https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": f"{sys_prompt}\n\n{text}"}]}
        elif provider == 'DeepSeek':
            url, headers = "https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "deepseek-chat", "messages": [{"role": "user", "content": f"{sys_prompt}\n\n{text}"}]}
        elif provider == 'OpenRouter':
            url, headers = "https://openrouter.ai/api/v1/chat/completions", {"Authorization": f"Bearer {api_key}", "X-Title": "TokenForge"}
            payload = {"model": "openai/gpt-3.5-turbo", "messages": [{"role": "user", "content": f"{sys_prompt}\n\n{text}"}]}
        elif provider == 'NVIDIA':
            url, headers = "https://integrate.api.nvidia.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "meta/llama-3.1-405b", "messages": [{"role": "user", "content": f"{sys_prompt}\n\n{text}"}]}
        else: return jsonify({"error": "Unsupported provider"}), 400

        res = requests.post(url, json=payload, headers=headers)
        result = res.json()
        if res.status_code != 200: return jsonify({"error": result.get('error', {}).get('message', 'API Error')}), res.status_code
        
        optimized_text = result['choices'][0]['message']['content']
        orig_t, _ = count_tokens(text)
        opt_t, _ = count_tokens(optimized_text)
        return jsonify({
            "original_tokens": orig_t, "optimized_tokens": opt_t, 
            "optimized_text": optimized_text, "percent_reduction": round(((orig_t - opt_t)/orig_t*100), 2)
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/run-playground', methods=['POST'])
def run_playground():
    data = request.json
    text, api_key, provider = data.get('text', ''), data.get('api_key', ''), data.get('provider', 'OpenRouter')
    if not api_key: return jsonify({"error": "Missing API Key"}), 400
    
    try:
        # Standard chat completion payload
        messages = [{"role": "user", "content": text}]
        
        if provider == 'OpenAI':
            url, headers = "https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "gpt-4o-mini", "messages": messages}
        elif provider == 'DeepSeek':
            url, headers = "https://api.openai.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "deepseek-chat", "messages": messages}
        elif provider == 'OpenRouter':
            url, headers = "https://openrouter.ai/api/v1/chat/completions", {"Authorization": f"Bearer {api_key}", "X-Title": "TokenForge"}
            payload = {"model": "openai/gpt-3.5-turbo", "messages": messages}
        elif provider == 'NVIDIA':
            url, headers = "https://integrate.api.nvidia.com/v1/chat/completions", {"Authorization": f"Bearer {api_key}"}
            payload = {"model": "meta/llama-3.1-405b", "messages": messages}
        else: return jsonify({"error": "Unsupported provider"}), 400

        res = requests.post(url, json=payload, headers=headers)
        result = res.json()
        if res.status_code != 200: return jsonify({"error": result.get('error', {}).get('message', 'API Error')}), res.status_code
        
        return jsonify({
            "response": result['choices'][0]['message']['content'],
            "tokens_used": result.get('usage', {}).get('total_tokens', 0)
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/validate', methods=['POST'])
def validate():
    data = request.json
    similarity = difflib.SequenceMatcher(None, data.get('original_output', ''), data.get('optimized_output', '')).ratio()
    return jsonify({"similarity_score": round(similarity * 100, 2), "status": "Success" if similarity > 0.8 else "Warning"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
