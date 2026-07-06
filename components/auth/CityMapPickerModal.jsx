import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { HiLocationMarker, HiX } from 'react-icons/hi';

const DEFAULT_CENTER = [32.0853, 34.7818];

const pinIcon = L.divIcon({
  className: 'hiro-map-pin',
  html: '<div class="hiro-map-pin__inner"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" d="M12 2a7 7 0 0 0-7 7c0 5.15 7 13 7 13s7-7.85 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg></div>',
  iconSize: [34, 46],
  iconAnchor: [17, 42],
});

function SelectionSync({ position }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

function MapSelectionHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function getCityLabel(data) {
  const address = data?.address || {};
  const displayNameFirstPart = String(data?.display_name || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  const candidates = [
    address.city_district,
    address.locality,
    address.city,
    address.town,
    address.village,
    address.hamlet,
    address.suburb,
    address.neighbourhood,
    address.residential,
    address.borough,
    displayNameFirstPart,
    data?.name,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const nonRegionalCandidate = candidates.find((value) => (
    !value.includes('מועצה אזורית')
    && !value.includes('מחוז')
    && !value.includes('נפת')
    && !value.includes('אזור')
  ));

  return nonRegionalCandidate || candidates[0] || '';
}

function hasHebrewText(value) {
  return /[\u0590-\u05FF]/.test(String(value || ''));
}

export default function CityMapPickerModal({
  isOpen,
  initialCity = '',
  initialLat = null,
  initialLng = null,
  allowAnyLocation = false,
  eyebrow = 'Map Picker',
  title = 'Choose your city from the map',
  subtitle = 'Tap the map or drag the pin, then confirm the city.',
  selectedLabel = 'Selected city',
  emptySelectionText = 'Tap on the map to choose a city',
  showNameInput = false,
  initialName = '',
  nameLabel = 'Location name',
  namePlaceholder = 'Name this location',
  onClose,
  onConfirm,
}) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [cityName, setCityName] = useState(initialCity);
  const [locationName, setLocationName] = useState(initialName);
  const [isResolvingCity, setIsResolvingCity] = useState(false);
  const [hasResolvedCurrentPoint, setHasResolvedCurrentPoint] = useState(false);
  const [locationError, setLocationError] = useState('');

  const mapCenter = useMemo(() => {
    if (selectedLocation) return [selectedLocation.lat, selectedLocation.lng];
    if (Number.isFinite(initialLat) && Number.isFinite(initialLng)) return [initialLat, initialLng];
    return DEFAULT_CENTER;
  }, [initialLat, initialLng, selectedLocation]);

  useEffect(() => {
    if (!isOpen) return;

    if (Number.isFinite(initialLat) && Number.isFinite(initialLng)) {
      setSelectedLocation({
        lat: Number(initialLat),
        lng: Number(initialLng),
      });
      setCityName(initialCity || '');
      setLocationName(initialName || '');
      setHasResolvedCurrentPoint(Boolean(initialCity));
      setLocationError('');
      return;
    }

    setSelectedLocation({
      lat: DEFAULT_CENTER[0],
      lng: DEFAULT_CENTER[1],
    });
    setCityName(initialCity || '');
    setLocationName(initialName || '');
    setHasResolvedCurrentPoint(false);
    setLocationError('');
  }, [initialCity, initialLat, initialLng, initialName, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedLocation || hasResolvedCurrentPoint) return;

    let cancelled = false;

    async function resolveCity() {
      setIsResolvingCity(true);
      setLocationError('');

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedLocation.lat}&lon=${selectedLocation.lng}&zoom=18&addressdetails=1&accept-language=he`,
          {
            headers: {
              Accept: 'application/json',
              'Accept-Language': 'he',
            },
          }
        );

        if (!response.ok) throw new Error('Failed to resolve city');

        const data = await response.json();
        const nextCity = getCityLabel(data);

        if (!cancelled) {
          setCityName(nextCity || '');
          if (!nextCity && !allowAnyLocation) {
            setLocationError('We found the location, but not a city name. Try another point.');
          } else if (nextCity && !hasHebrewText(nextCity) && !allowAnyLocation) {
            setLocationError('Please choose a location that returns a Hebrew city name.');
          }
        }
      } catch (error) {
        if (!cancelled && !allowAnyLocation) {
          setLocationError('Could not read the city name from the map. Try again.');
        }
      } finally {
        if (!cancelled) {
          setIsResolvingCity(false);
          setHasResolvedCurrentPoint(true);
        }
      }
    }

    resolveCity();

    return () => {
      cancelled = true;
    };
  }, [allowAnyLocation, hasResolvedCurrentPoint, isOpen, selectedLocation]);

  function handleUseCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not available on this device.');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setHasResolvedCurrentPoint(false);
      },
      () => {
        setLocationError('Could not get your current location. You can still tap the map.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function handleSelect(location) {
    setSelectedLocation(location);
    setHasResolvedCurrentPoint(false);
  }

  function handleConfirm() {
    if (!selectedLocation) return;
    if (allowAnyLocation) {
      onConfirm({
        city: cityName.trim(),
        name: locationName.trim(),
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
      });
      return;
    }

    if (!cityName.trim()) {
      setLocationError('Pick a point with a valid city before continuing.');
      return;
    }
    if (!hasHebrewText(cityName)) {
      setLocationError('City name must be in Hebrew.');
      return;
    }

    onConfirm({
      city: cityName.trim(),
      name: locationName.trim(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    });
  }

  if (!isOpen) return null;

  const displayLocationLabel = cityName || (
    allowAnyLocation && selectedLocation
      ? `${selectedLocation.lat}, ${selectedLocation.lng}`
      : emptySelectionText
  );

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-extrabold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close map picker"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="overflow-hidden rounded-[28px] border border-slate-200">
            <div className="h-[340px] w-full bg-slate-100">
              <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <SelectionSync position={selectedLocation} />
                <MapSelectionHandler onSelect={handleSelect} />
                {selectedLocation ? (
                  <Marker
                    position={[selectedLocation.lat, selectedLocation.lng]}
                    draggable
                    icon={pinIcon}
                    eventHandlers={{
                      dragend: (event) => {
                        const marker = event.target;
                        const latlng = marker.getLatLng();
                        handleSelect({
                          lat: Number(latlng.lat.toFixed(6)),
                          lng: Number(latlng.lng.toFixed(6)),
                        });
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[28px] bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{selectedLabel}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                    <HiLocationMarker className="h-4 w-4" />
                  </span>
                  <span className={clsx('text-sm font-semibold', displayLocationLabel !== emptySelectionText ? 'text-slate-900' : 'text-slate-400')}>
                    {isResolvingCity ? 'Finding location name...' : displayLocationLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Use my location
              </button>
            </div>
            {locationError ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {locationError}
              </p>
            ) : null}

            {showNameInput ? (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{nameLabel}</span>
                <input
                  type="text"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder={namePlaceholder}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedLocation || isResolvingCity || (!allowAnyLocation && !cityName.trim())}
            className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
