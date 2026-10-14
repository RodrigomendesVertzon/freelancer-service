# freelancer-service

Primeira versão do microsserviço de cadastro de freelancers.

## Requisitos
- Node.js
- MySQL 8
- banco `freelancer_service` já criado com o script consolidado
- `auth-service` configurado com o mesmo `JWT_ACCESS_SECRET`

## Instalação

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Edite `.env` antes de iniciar.

## Testes iniciais

### Health
GET http://localhost:3002/health/live
GET http://localhost:3002/health/ready

### Cadastro
POST http://localhost:3002/v1/freelancers
Authorization: Bearer <ACCESS_TOKEN_DO_AUTH>
Content-Type: application/json

```json
{
  "cpf": "52998224725",
  "nome": "Freelancer Teste",
  "dataNascimento": "1990-01-12",
  "email": "freelancer.teste@example.com",
  "whatsapp": "11999999999",
  "chavePix": "52998224725",
  "tipoChavePix": "CPF",
  "endereco": {
    "cep": "06300000",
    "logradouro": "Rua Teste",
    "numero": "100",
    "complemento": null,
    "bairro": "Centro",
    "cidade": "Carapicuiba",
    "estado": "SP"
  },
  "contatosEmergencia": [
    { "nome": "Contato Um", "telefone": "11988888888", "parentesco": "Familiar" },
    { "nome": "Contato Dois", "telefone": "11977777777", "parentesco": "Familiar" }
  ]
}
```

### Perfil do usuário autenticado
GET http://localhost:3002/v1/freelancers/me
Authorization: Bearer <ACCESS_TOKEN_DO_AUTH>

## Observação de autenticação
O freelancer-service não armazena senha ou refresh token. Ele valida o access token emitido pelo auth-service e usa o identificador do usuário como `auth_user_id`.
