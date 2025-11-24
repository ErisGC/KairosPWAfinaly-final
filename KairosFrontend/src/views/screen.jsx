// src/views/screen.jsx
import React, { useEffect, useState } from 'react';
import { turnService } from '../services/turnService';
import { startConnection, getConnection } from '../services/signalR';

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = 660;

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn('No se pudo reproducir sonido de pantalla', e);
  }
}

function ScreenView() {
  const [calledTurns, setCalledTurns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar últimos turnos atendidos al abrir la pantalla
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const data = await turnService.GetRecentCalled(20);
        const mapped = (data || []).map((t) => ({
          idTurn: t.idTurn,
          number: t.number,
          serviceId: t.serviceId,
          serviceName: t.serviceName,
          clientName: t.clientName,
        }));
        setCalledTurns(mapped);
      } catch (err) {
        console.error('Error cargando turnos recientes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  // Suscribirse a eventos en tiempo real
  useEffect(() => {
    let isMounted = true;

    const setupSignalR = async () => {
      try {
        const conn = await startConnection();
        if (!isMounted) return;

        conn.on('TurnCalled', (payload) => {
          if (!payload) return;
          playNotificationSound();

          const newItem = {
            idTurn: payload.idTurn || null,
            number: payload.number,
            serviceId: payload.serviceId,
            serviceName: payload.serviceName,
            clientName: payload.clientName,
          };

          setCalledTurns((prev) => {
            const updated = [newItem, ...prev];
            return updated.slice(0, 20); // máximo 20 en pantalla
          });
        });
      } catch (err) {
        console.error('Error conectando a SignalR en pantalla:', err);
      }
    };

    setupSignalR();

    return () => {
      isMounted = false;
      const conn = getConnection();
      if (conn) {
        conn.off('TurnCalled');
      }
    };
  }, []);

  return (
    <div className="container py-4">
      <div className="text-center mb-4">
        <h1 className="display-5 fw-bold">Pantalla de turnos</h1>
        <p className="text-muted">
          Manténgase atento: cuando se llame un nuevo turno, esta pantalla emitirá una alerta sonora.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-muted">Cargando turnos recientes...</p>
      ) : calledTurns.length === 0 ? (
        <p className="text-center text-muted">
          Aún no se ha llamado ningún turno.
        </p>
      ) : (
        <div className="list-group">
          {calledTurns.map((t, index) => (
            <div
              key={`${t.serviceId}-${t.number}-${index}`}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                <div className="fs-3 fw-bold">
                  Turno&nbsp;{t.number}
                </div>
                <div className="small text-muted">
                  Servicio: <strong>{t.serviceName || '—'}</strong>
                  {t.clientName && (
                    <>
                      {' · '}
                      Cliente: <strong>{t.clientName}</strong>
                    </>
                  )}
                </div>
              </div>
              <div className="badge bg-primary rounded-pill fs-6">
                Llamando
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ScreenView;
