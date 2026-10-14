const spotsList = document.querySelector('#spots-list');
const spotsMessage = document.querySelector('#spots-message');
const spotSelect = document.querySelector('#parking-spot');
const reservationForm = document.querySelector('#reservation-form');
const reservationMessage = document.querySelector('#reservation-message');
const reservationsList = document.querySelector('#reservations-list');
const reservationsMessage = document.querySelector('#reservations-message');

function showLoading() {
  spotsList.replaceChildren();
  spotsMessage.textContent = 'Cargando espacios...';
  // Mostrar "Cargando espacios..." antes de esperar la respuesta del Backend.
}

function showError() {
  spotsList.replaceChildren();
  spotSelect.replaceChildren();
  spotsMessage.className = 'error';
  spotsMessage.textContent = 'No se pudieron cargar los espacios.';
}

function renderSpots(spots) {
  spotsList.replaceChildren();
  spotSelect.replaceChildren();

  // Si la petición fue exitosa pero no hay espacios,
  // mostrar "No hay espacios disponibles."
  if (spots.length === 0) {
    spotsMessage.textContent = 'No hay espacios disponibles.';
    return;
  }

  spotsMessage.textContent = '';

  for (const spot of spots) {
    const option = document.createElement('option');
    option.value = spot.id;
    option.textContent = `${spot.number} - Zona ${spot.zone}`;
    spotSelect.append(option);

    const card = document.createElement('article');
    card.className = 'card';

    const title = document.createElement('h3');
    title.textContent = spot.number;

    const details = document.createElement('p');
    details.textContent = `Zona ${spot.zone} - ${spot.type}`;

    const status = document.createElement('p');
    status.textContent = spot.available ? 'Disponible ahora' : 'Ocupado ahora';
    status.className = spot.available ? 'available' : 'unavailable';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Reservar';
    button.addEventListener('click', () => {
      spotSelect.value = spot.id;
      reservationForm.scrollIntoView({ behavior: 'smooth' });
      document.querySelector('#start-time').focus();
    });

    card.append(title, details, status, button);
    spotsList.append(card);
  }
}

async function loadSpots() {
  const selectedSpot = spotSelect.value;
  showLoading();
  spotsMessage.className = '';

  try {
    let response;

    // Solicitar los espacios al Backend usando fetch().
    response = await fetch('/api/spots');

    // Detectar una respuesta HTTP no exitosa
    // y mostrar un mensaje de error al usuario.
    if (!response.ok) {
      throw new Error('Could not load parking spots');
    }

    const spots = await response.json();
    renderSpots(spots);
    if (spots.some((spot) => spot.id === selectedSpot)) {
      spotSelect.value = selectedSpot;
    }
  } catch (error) {
    console.error(error);
    showError();
  }
}

async function createReservation(event) {
  event.preventDefault();
  reservationMessage.textContent = 'Creando reservación...';
  reservationMessage.className = '';

  const formData = new FormData(reservationForm);
  const parkingSpotId = formData.get('parkingSpotId');
  const startTime = formData.get('startTime');
  const endTime = formData.get('endTime');

  try {
    const reservationData = {
      parkingSpotId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };
    let response;

    // Enviar la reservación al Backend usando POST.
    // Configurar method, Content-Type y body JSON.
    response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reservationData)
    });

    // Si el Backend responde 409 Conflict,
    // mostrar un mensaje específico al usuario.
    // Para otros errores, mantener el mensaje genérico.
    if (response.status === 409) {
      reservationMessage.textContent =
        'Ese espacio ya está reservado en ese horario.';
      reservationMessage.className = 'error';
      return;
    }

    if (!response.ok) {
      throw new Error('Could not create reservation');
    }

    reservationMessage.textContent = 'Reservación creada correctamente.';
    reservationMessage.className = 'success';

    // Después de una operación exitosa,
    // actualizar espacios y reservaciones
    // sin recargar manualmente el navegador.
    await loadSpots();
    await loadReservations();

  } catch (error) {
    console.error(error);
    reservationMessage.textContent = 'No fue posible crear la reservación.';
    reservationMessage.className = 'error';
  }
}

async function loadReservations() {
  reservationsList.replaceChildren();
  reservationsMessage.textContent = 'Cargando reservaciones...';
  reservationsMessage.className = '';

  try {
    const response = await fetch('/api/reservations');
    if (!response.ok) {
      throw new Error('Could not load reservations');
    }

    const reservations = await response.json();
    reservationsMessage.textContent = reservations.length === 0 ? 'No hay reservaciones.' : '';

    for (const reservation of reservations) {
      const card = document.createElement('article');
      card.className = 'card';

      const title = document.createElement('h3');
      title.textContent = reservation.parkingSpotId?.number ?? 'Espacio eliminado';

      const period = document.createElement('p');
      period.textContent = `${new Date(reservation.startTime).toLocaleString()} – ${new Date(reservation.endTime).toLocaleString()}`;

      const status = document.createElement('p');
      status.textContent = reservation.status === 'ACTIVE' ? 'Activa' : 'Cancelada';

      card.append(title, period, status);

      if (reservation.status === 'ACTIVE') {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Cancelar';
        button.addEventListener('click', () => cancelReservation(reservation._id));
        card.append(button);
      }

      reservationsList.append(card);
    }
  } catch (error) {
    console.error(error);
    reservationsMessage.textContent = 'No se pudieron cargar las reservaciones.';
    reservationsMessage.className = 'error';
  }
}

async function cancelReservation(id) {
  try {
    const response = await fetch(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
    if (!response.ok) {
      throw new Error('Could not cancel reservation');
    }

    await loadSpots();
    await loadReservations();

    reservationsMessage.textContent = 'Reservación cancelada correctamente.';
    reservationsMessage.className = 'success';
  } catch (error) {
    console.error(error);
    reservationsMessage.textContent = 'No fue posible cancelar la reservación.';
    reservationsMessage.className = 'error';
  }
}

document.querySelector('#refresh-button').addEventListener('click', loadSpots);
reservationForm.addEventListener('submit', createReservation);
loadSpots();
loadReservations();
