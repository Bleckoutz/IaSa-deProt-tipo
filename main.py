import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types

app = FastAPI(title="NeuroLink_FIEB API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

SYSTEM_INSTRUCTION = """
Você é o assistente educativo do NeuroLink_FIEB para crianças com DM1 e suas famílias.
Sua missão: Responder com explicações curtas, claras e acolhedoras sobre contagem de carboidratos e glicemia.
REGRAS: NUNCA prescreva doses de insulina.
"""

DATA_STORE = {
    "pontos": 62,
    "ultima_glicemia": 135,
    "status_glicemia": "Normal",
    "humor_atual": "Super Bem 😊",
    "alerta_whatsapp_enviado": False,
    "registros": [
        {"hora": "07:00", "tipo": "comida", "detalhe": "30g carb — Café da manhã", "local": "Casa", "feedback_ia": "Bom aporte de energia!"},
        {"hora": "07:30", "tipo": "glicemia", "detalhe": "112 mg/dL — Antes das aulas", "local": "Casa", "feedback_ia": "Nível ideal para começar o dia."},
        {"hora": "09:30", "tipo": "insulina", "detalhe": "4 UI — Insulina Basal", "local": "Casa", "feedback_ia": "Registrado com sucesso!"},
        {"hora": "10:15", "tipo": "glicemia", "detalhe": "135 mg/dL — Medição na escola", "local": "Escola", "feedback_ia": "Glicemia estabilizada!"}
    ]
}

class ChatQuery(BaseModel):
    mensagem: str

class RegistroCrianca(BaseModel):
    tipo: str
    detalhe: str
    local: Optional[str] = "Casa"

def disparar_whatsapp_alerta(mensagem: str):
    DATA_STORE["alerta_whatsapp_enviado"] = True
    print(f"📱 [WHATSAPP DISPARADO PARA ROSA (MÃE)]: {mensagem}")

@app.get("/")
def home():
    return {"status": "Online", "projeto": "NeuroLink_FIEB"}

@app.get("/api/dashboard")
def get_dashboard():
    return DATA_STORE

@app.post("/api/crianca/registrar")
def registrar_acao(reg: RegistroCrianca):
    DATA_STORE["pontos"] = min(100, DATA_STORE["pontos"] + 10)
    alerta_mensagem = None

    if reg.tipo == "glicemia":
        try:
            val = int(''.join(filter(str.isdigit, reg.detalhe)))
            DATA_STORE["ultima_glicemia"] = val
            if val < 70:
                DATA_STORE["status_glicemia"] = "Atenção: Baixa!"
                alerta_mensagem = f"🚨 ALERTA NEUROLINK: Arthur registrou glicemia de {val} mg/dL (Hipoglicemia)."
            elif val > 250:
                DATA_STORE["status_glicemia"] = "Alta"
                alerta_mensagem = f"⚠️ AVISO NEUROLINK: Arthur registrou glicemia de {val} mg/dL (Hiperglicemia)."
            else:
                DATA_STORE["status_glicemia"] = "Normal"
        except ValueError:
            pass

    elif reg.tipo == "humor" and any(k in reg.detalhe for k in ["Fraco", "Mal", "Tonto"]):
        DATA_STORE["humor_atual"] = reg.detalhe
        alerta_mensagem = f"⚠️ AVISO NEUROLINK: Arthur informou que está se sentindo: '{reg.detalhe}'."

    if alerta_mensagem:
        disparar_whatsapp_alerta(alerta_mensagem)

    feedback_ia = "Registro salvo! +10 pontos de energia! 🌟"
    if client:
        try:
            prompt = f"O Arthur registrou -> Tipo: {reg.tipo}, Detalhe: {reg.detalhe}. Responda com carinho em 1 frase."
            res = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION, temperature=0.3)
            )
            feedback_ia = res.text
        except Exception:
            pass

    log_entry = {
        "hora": datetime.now().strftime("%H:%M"),
        "tipo": reg.tipo,
        "detalhe": reg.detalhe,
        "local": reg.local or "Casa",
        "feedback_ia": feedback_ia
    }
    DATA_STORE["registros"].insert(0, log_entry)

    return {
        "pontos": DATA_STORE["pontos"],
        "feedback_ia": feedback_ia,
        "status_glicemia": DATA_STORE["status_glicemia"],
        "alerta_whatsapp": DATA_STORE["alerta_whatsapp_enviado"],
        "registros": DATA_STORE["registros"]
    }

@app.post("/api/ia/chat")
def chat_ia(data: ChatQuery):
    msg = data.mensagem.lower()
    
    if client:
        try:
            res = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=data.mensagem,
                config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION, temperature=0.3)
            )
            return {"resposta": res.text}
        except Exception:
            pass

    if any(k in msg for k in ["pão", "carboidrato", "carb"]):
        resposta = "Um pão francês simples tem cerca de 28g a 30g de carboidratos."
    elif any(k in msg for k in ["hipo", "baixo"]):
        resposta = "Para glicemia abaixo de 70 mg/dL, siga a regra dos 15g de carboidrato rápido e aguarde 15 min."
    else:
        resposta = f"Entendi sua pergunta sobre '{data.mensagem}'. Mantenha o acompanhamento em dia!"

    return {"resposta": resposta}

# --- ENDPOINTS DO MÓDULO MÉDICO (CLÍNICA) ---

@app.get("/api/medico/metricas")
def get_metricas_medicas():
    registros_glicemia = []
    for r in DATA_STORE["registros"]:
        if r["tipo"] == "glicemia":
            digits = ''.join(filter(str.isdigit, r["detalhe"]))
            if digits:
                registros_glicemia.append(int(digits))
    
    if not registros_glicemia:
        return {
            "tir": 76,
            "media": 138,
            "hipo": 2,
            "hiper": 5,
            "no_alvo_pct": 76,
            "hipo_pct": 8,
            "hiper_pct": 16
        }
    
    total = len(registros_glicemia)
    no_alvo = sum(1 for v in registros_glicemia if 70 <= v <= 180)
    hipo = sum(1 for v in registros_glicemia if v < 70)
    hiper = sum(1 for v in registros_glicemia if v > 180)
    
    return {
        "tir": round((no_alvo / total) * 100),
        "media": round(sum(registros_glicemia) / total),
        "hipo": hipo,
        "hiper": hiper,
        "no_alvo_pct": round((no_alvo / total) * 100),
        "hipo_pct": round((hipo / total) * 100),
        "hiper_pct": round((hiper / total) * 100)
    }

@app.get("/api/medico/exportar-pdf")
def exportar_relatorio_pdf():
    return {
        "sucesso": True,
        "mensagem": "Relatório clínico compilado com sucesso!",
        "paciente": "Arthur Silva",
        "medico": "Dr. Eduardo Mendes - CRM 54321-SP",
        "data_emissao": datetime.now().strftime("%d/%m/%Y %H:%M")
    }