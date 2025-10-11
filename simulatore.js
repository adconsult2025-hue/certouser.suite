// Gestione dello scorrimento dei passi e della simulazione
document.addEventListener('DOMContentLoaded', () => {
  const steps = Array.from(document.querySelectorAll('.step'));
  let currentStep = 0;
  // Memorizza l'ultima energia esportata per la compatibilitÃ  CER
  let lastEnergiaEsportata = 0;
  // Memorizza l'ultimo costo dell'impianto
  let lastCostOfPlant = 0;
  // Memorizza l'ultimo risparmio annuo
  let lastRisparmio = 0;
  // Mostra il primo passo
  showStep(currentStep);

  // Aggiungi gestori a tutti i pulsanti next, prev, simulate, restart
  document.querySelectorAll('.next').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        currentStep = Math.min(currentStep + 1, steps.length - 1);
        showStep(currentStep);
      }
    });
  });
  document.querySelectorAll('.prev').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentStep = Math.max(currentStep - 1, 0);
      showStep(currentStep);
    });
  });
  document.querySelectorAll('.simulate').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        runSimulation();
        currentStep = Math.min(currentStep + 1, steps.length - 1);
        showStep(currentStep);
      }
    });
  });
  document.querySelectorAll('.restart').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('simForm').reset();
      currentStep = 0;
      showStep(currentStep);
      document.getElementById('resultContent').innerHTML = '';
      // Reset sezione compatibilitÃ  CER
      const cerSection = document.getElementById('cerCompatSection');
      if (cerSection) {
        cerSection.style.display = 'none';
        document.getElementById('incentivoResult').innerHTML = '';
        document.getElementById('kwh_condivisi').value = '';
        document.getElementById('tariffa_premio').value = '';
      }
    });
  });

  // Gestione pulsante compatibilitÃ  CER
  const cerCompatBtn = document.getElementById('cerCompatBtn');
  const cerCompatSection = document.getElementById('cerCompatSection');
  if (cerCompatBtn && cerCompatSection) {
    cerCompatBtn.addEventListener('click', () => {
      // Toggle visibilitÃ  della sezione compatibilitÃ 
      if (cerCompatSection.style.display === 'block') {
        cerCompatSection.style.display = 'none';
      } else {
        cerCompatSection.style.display = 'block';
      }
    });
  }

  // Gestione calcolo incentivo
  const calcIncentivoBtn = document.getElementById('calcolaIncentivo');
  if (calcIncentivoBtn) {
    calcIncentivoBtn.addEventListener('click', () => {
      const kwh = parseFloat(document.getElementById('kwh_condivisi').value) || 0;
      const tariffaPremioInput = parseFloat(document.getElementById('tariffa_premio').value) || 0;
      const grantApplied = document.getElementById('grant_40').checked;
      const detrazione = parseFloat(document.getElementById('detrazione_fiscale').value) || 0;
      // Calcola tariffa effettiva: dimezza se grant 40% attivo
      const effectiveTariffa = grantApplied ? tariffaPremioInput / 2 : tariffaPremioInput;
      const incentivoTotale = kwh * effectiveTariffa;
      // Calcola contributi e detrazioni sul costo dell'impianto
      const grantValue = grantApplied ? lastCostOfPlant * 0.4 : 0;
      const detrazioneValue = lastCostOfPlant * (detrazione / 100);
      const result = document.getElementById('incentivoResult');
      // Calcola payback con incentivi
      const netCost = lastCostOfPlant - grantValue - detrazioneValue;
      const netAnnualBenefit = lastRisparmio + incentivoTotale;
      const paybackIncentivi = netAnnualBenefit > 0 ? (netCost / netAnnualBenefit).toFixed(1) : 'N/A';
      result.innerHTML = `
        <p><strong>Tariffa premio applicata:</strong> â‚¬ ${effectiveTariffa.toFixed(3)} per kWh</p>
        <p><strong>Incentivo totale:</strong> â‚¬ ${incentivoTotale.toFixed(2)}</p>
        <p><strong>Contributo a fondo perduto:</strong> â‚¬ ${grantValue.toFixed(2)}</p>
        <p><strong>Detrazione fiscale:</strong> â‚¬ ${detrazioneValue.toFixed(2)}</p>
        <p><strong>Tempo di ritorno con incentivi:</strong> ${paybackIncentivi} anni</p>
      `;
    });
  }

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });
  }

  // Valida i campi nel passo corrente (semplice validazione HTML5)
  function validateStep(index) {
    const step = steps[index];
    const inputs = Array.from(step.querySelectorAll('input, select'));
    return inputs.every((input) => {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
      return true;
    });
  }

  function runSimulation() {
    // Preleva i valori
    const consumo = parseFloat(document.getElementById('consumo').value) || 0;
    const potenza = parseFloat(document.getElementById('potenza').value) || 0;
    const orientamento = document.getElementById('orientamento').value;
    const inclinazione = parseFloat(document.getElementById('inclinazione').value) || 0;
    const tariffa = parseFloat(document.getElementById('tariffa').value) || 0;
    const costoFisso = parseFloat(document.getElementById('costo_fisso').value) || 0;

    // Fattori semplificati per orientamento
    let orientFactor = 1;
    switch (orientamento) {
      case 'sud':
        orientFactor = 1.0;
        break;
      case 'est':
      case 'ovest':
        orientFactor = 0.9;
        break;
      case 'nord':
        orientFactor = 0.75;
        break;
      default:
        orientFactor = 1.0;
    }
    // Fattore inclinazione semplificato: massimo a 30Â°, diminuisce linearmente
    let inclFactor = 1 - Math.min(Math.abs(inclinazione - 30) / 60, 0.4);
    inclFactor = Math.max(inclFactor, 0.6);

    // Produzione annua specifica: 1200 kWh per kW installato (valore indicativo Italia)
    const produzioneSpecifica = 1200;
    const energiaProdotta = potenza * produzioneSpecifica * orientFactor * inclFactor;
    const autoconsumo = Math.min(energiaProdotta, consumo);
    const energiaEsportata = Math.max(energiaProdotta - autoconsumo, 0);
    // Salva l'energia esportata per uso successivo
    lastEnergiaEsportata = energiaEsportata;
    // Valutazione economica: autoconsumo pieno valore, esportazione metÃ  valore
    const valoreAutoconsumo = autoconsumo * tariffa;
    const valoreEsportazione = energiaEsportata * tariffa * 0.5;
    const risparmioTotale = valoreAutoconsumo + valoreEsportazione - costoFisso;

    // Payback period: consenti all'utente di inserire il costo impianto
    // Se l'utente non specifica il costo, usa un costo indicativo di 1200 â‚¬ per kW
    const costoImpiantoUtente = parseFloat(document.getElementById('costo_impianto').value) || 0;
    const costoImpiantoPerKw = 1200;
    let costoImpianto;
    if (costoImpiantoUtente > 0) {
      costoImpianto = costoImpiantoUtente;
    } else {
      costoImpianto = potenza * costoImpiantoPerKw;
    }
    const payback = risparmioTotale > 0 ? (costoImpianto / risparmioTotale).toFixed(1) : 'N/A';

    // Salva il costo dell'impianto per uso in compatibilitÃ  CER
    lastCostOfPlant = costoImpianto;
    // Salva il risparmio totale annuo
    lastRisparmio = risparmioTotale;

    // Popola i risultati
    const resultDiv = document.getElementById('resultContent');
    resultDiv.innerHTML = `
      <p><strong>Energia prodotta:</strong> ${energiaProdotta.toFixed(0)} kWh/anno</p>
      <p><strong>Energia autoconsumata:</strong> ${autoconsumo.toFixed(0)} kWh/anno</p>
      <p><strong>Energia esportata:</strong> ${energiaEsportata.toFixed(0)} kWh/anno</p>
      <p><strong>Risparmio annuo stimato:</strong> â‚¬ ${risparmioTotale.toFixed(2)}</p>
      <p><strong>Tempo di ritorno dell'investimento:</strong> ${payback} anni</p>
    `;

    // Aggiorna il campo kWh condivisi nella sezione compatibilitÃ  CER
    const kwhField = document.getElementById('kwh_condivisi');
    if (kwhField) {
      kwhField.value = energiaEsportata.toFixed(0);
    }
  }
});