const http = require('http');

function createPlan() {
  console.log('Testando criação de plano com múltiplas filiais...');
  
  const data = JSON.stringify({
    name: "Plano Trimestral",
    description: "Plano trimestral com 12 sessões e acesso a todas as filiais",
    totalSessions: 12,
    totalPrice: 2160,
    validityDays: 90,
    isActive: true,
    branchIds: ["70311421-2202-482f-be01-1d2edc051f2d", "77b69c32-ab27-4ab1-adfc-e71bce85bfbd"]
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/therapy-plans',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const req = http.request(options, res => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    
    res.on('data', chunk => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(responseData);
        console.log('Resposta da API:', JSON.stringify(parsedData, null, 2));
      } catch (e) {
        console.log('Resposta bruta:', responseData);
      }
      console.log('Teste concluído!');
    });
  });
  
  req.on('error', error => {
    console.error('Erro durante o teste:', error);
  });
  
  req.write(data);
  req.end();
}

createPlan(); 