import asyncio
import contextlib
import io
import json
import os
import unittest
from unittest.mock import AsyncMock, patch
os.environ["OTEL_SDK_DISABLED"]="true"
os.environ["CREWAI_TELEMETRY_DISABLED"]="true"
os.environ["CREWAI_TRACING_ENABLED"]="false"
from crewai import BaseLLM, LLM
from fastapi.testclient import TestClient
from crew import run
from app import app, execute

class StubLLM(BaseLLM):
    def __init__(self):
        super().__init__(model="stub",temperature=0)
        self.calls=0
    def call(self,messages,**kwargs):
        self.calls+=1
        return 'Final Answer: '+('Customer wants product choices.' if self.calls==1 else json.dumps({"messages":["اختار ما يناسبك"],"actions":[{"name":"show_products","arguments":{"productIds":["phone"]}}]}))
    def supports_function_calling(self): return False
    def get_context_window_size(self):return 32000

class CrewTests(unittest.TestCase):
    def test_real_crew_orchestration_with_mock_model(self):
        llm=StubLLM()
        with contextlib.redirect_stdout(io.StringIO()):
            result=run({"instructions":"Reply in Arabic. Demo only.","messages":[{"id":"one","role":"user","text":"اعرض الهواتف"}],"tools":[]},llm)
        self.assertEqual(llm.calls,2)
        self.assertEqual(result['actions'][0]['name'],'show_products')
    def test_openrouter_model_namespace_is_preserved(self):
        llm=LLM(model='openai/openai/test-model',custom_openai=True,base_url='https://openrouter.ai/api/v1',api_key='test-only')
        self.assertEqual(llm.model,'openai/test-model')
    def test_private_http_endpoint(self):
        with patch.dict(os.environ,{"CREWAI_SERVICE_TOKEN":"test-token","OPENROUTER_API_KEY":"test-key","OPENROUTER_MODEL":"test-model"}):
            client=TestClient(app)
            self.assertEqual(client.get('/health').status_code,401)
            headers={"Authorization":"Bearer test-token"}
            self.assertTrue(client.get('/health',headers=headers).json()['ready'])
            with patch('app.execute',new=AsyncMock(return_value={"messages":["Hello"],"actions":[]})):
                payload={"locale":"ar","messages":[{"role":"user","text":"Hello"}],"tools":[],"instructions":"Test"}
                self.assertEqual(client.post('/chat',json=payload,headers=headers).status_code,200)
                payload['messages'][0]['role']='system'
                self.assertEqual(client.post('/chat',json=payload,headers=headers).status_code,400)
    def test_disconnect_terminates_worker(self):
        class Process:
            returncode=None
            terminated=False
            async def communicate(self,data):await asyncio.sleep(60)
            def terminate(self):self.terminated=True;self.returncode=-15
            async def wait(self):return self.returncode
        process=Process();request=type('Request',(),{'is_disconnected':AsyncMock(return_value=True)})()
        async def check():
            with patch('app.asyncio.create_subprocess_exec',new=AsyncMock(return_value=process)):
                with self.assertRaises(Exception):await execute({},request)
            self.assertTrue(process.terminated)
        asyncio.run(check())

if __name__=='__main__':unittest.main()
