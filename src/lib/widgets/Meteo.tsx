import { defineWidget, scheme } from "../builder";

const querySchema = scheme.Object({
  city: scheme.String(),
});

type WeatherIconName =
  | "sun"
  | "sun-cloud"
  | "cloud"
  | "cloud-sun"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder"
  | "fog";

type CurrentWeather = {
  city: string;
  temperature: number;
  condition: string;
  icon: WeatherIconName;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
};

type DailyForecast = {
  date: string;
  weekday: string;
  condition: string;
  icon: WeatherIconName;
  maxTemp: number;
  minTemp: number;
};

type WeatherData = {
  current: CurrentWeather;
  forecast: DailyForecast[];
};

function getWeatherInfo(code: number, _isDay: boolean): { label: string; icon: WeatherIconName } {
  switch (code) {
    case 0:
      return { label: "Sereno", icon: "sun" };
    case 1:
      return { label: "Prevalentemente sereno", icon: "sun-cloud" };
    case 2:
      return { label: "Parzialmente nuvoloso", icon: "cloud-sun" };
    case 3:
      return { label: "Nuvoloso", icon: "cloud" };
    case 45:
    case 48:
      return { label: "Nebbia", icon: "fog" };
    case 51:
    case 53:
    case 55:
      return { label: "Pioggerella", icon: "drizzle" };
    case 61:
    case 63:
    case 65:
      return { label: "Pioggia", icon: "rain" };
    case 71:
    case 73:
    case 75:
      return { label: "Neve", icon: "snow" };
    case 80:
    case 81:
    case 82:
      return { label: "Rovesci", icon: "rain" };
    case 95:
    case 96:
    case 99:
      return { label: "Temporale", icon: "thunder" };
    default:
      return { label: "Nuvoloso", icon: "cloud" };
  }
}

function WeatherIcon({ name, className }: { name: WeatherIconName; className?: string }): React.ReactElement {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const sun = (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-2.05-6.95l-1.41 1.41M5.46 18.54l-1.41 1.41M19.95 4.05l-1.41 1.41M5.46 5.46L4.05 4.05" />
    </g>
  );

  const cloudPath = "M17.5 19h-11C4.46 19 3 17.54 3 15.83c0-1.37 1.08-2.51 2.42-2.66a3.5 3.5 0 1 1 6.58-1.5 1.5 1.5 0 0 0 2.5 1.06 3.5 3.5 0 1 1 3 6.27z";

  const icons: Record<WeatherIconName, React.ReactElement> = {
    sun: sun,
    "sun-cloud": (
      <g>
        <path d="M16.5 7a2.5 2.5 0 1 0-4.58-1.42" />
        <path d="M7 7h.01" />
        <path d="M12 4v1" />
        <path d="M4.22 9.22l.7.71" />
        {cloudPath}
      </g>
    ),
    cloud: (
      <g>
        <path d={cloudPath} />
      </g>
    ),
    "cloud-sun": (
      <g>
        <circle cx="12" cy="9" r="3" />
        <path d="M12 3v1m0 10v1M6.34 6.34l-.71-.71m12.73 12.73l-.71-.71M4.93 9h-1m16 0h-1" />
        <path d={cloudPath} />
      </g>
    ),
    drizzle: (
      <g>
        <path d={cloudPath} />
        <path d="M8 21v2m4-2v2m4-2v2" />
      </g>
    ),
    rain: (
      <g>
        <path d={cloudPath} />
        <path d="M8 20l-1 3m5-3l-1 3m5-3l-1 3" />
      </g>
    ),
    snow: (
      <g>
        <path d={cloudPath} />
        <path d="M9 21l1.5-1.5 1.5 1.5" />
        <path d="M15 21l1.5-1.5 1.5 1.5" />
      </g>
    ),
    thunder: (
      <g>
        <path d={cloudPath} />
        <path d="M13 16l-2 4h3l-1 4" />
      </g>
    ),
    fog: (
      <g>
        <path d="M4 15h16M4 18h16M4 12h16M6 9h12" />
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true" className={className} {...common}>
      {icons[name]}
    </svg>
  );
}

export const Meteo = defineWidget<typeof querySchema, WeatherData>({
  name: "meteo",
  size: "left",
  query: querySchema,
  defaultQuery: {
    city: "Perugia",
  },
  async backend({ query }) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.city)}&count=1&language=it&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw new Error("Errore geocodifica");
    }

    const geo = await geoRes.json() as {
      results?: Array<{
        name: string;
        latitude: number;
        longitude: number;
        timezone: string;
      }>;
    };

    if (!geo.results || geo.results.length === 0) {
      throw new Error("Città non trovata");
    }

    const place = geo.results[0]!;

    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${place.latitude}` +
      `&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=4&language=it`;

    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) {
      throw new Error("Errore previsioni");
    }

    const forecast = await forecastRes.json() as {
      current: {
        temperature_2m: number;
        relative_humidity_2m: number;
        is_day: number;
        precipitation: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
      };
    };

    const currentInfo = getWeatherInfo(forecast.current.weather_code, forecast.current.is_day === 1);

    const days = forecast.daily.time.slice(0, 3).map((date, i) => {
      const info = getWeatherInfo(forecast.daily.weather_code[i]!, forecast.current.is_day === 1);
      return {
        date,
        weekday: new Date(date).toLocaleDateString("it-IT", { weekday: "short" }),
        condition: info.label,
        icon: info.icon,
        maxTemp: forecast.daily.temperature_2m_max[i]!,
        minTemp: forecast.daily.temperature_2m_min[i]!,
      };
    });

    return {
      current: {
        city: place.name,
        temperature: forecast.current.temperature_2m,
        condition: currentInfo.label,
        icon: currentInfo.icon,
        humidity: forecast.current.relative_humidity_2m,
        windSpeed: forecast.current.wind_speed_10m,
        isDay: forecast.current.is_day === 1,
      },
      forecast: days,
    };
  },
  template: ({ data }) => {
    return (
      <article className="widget">
        <div className="widget-content">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="size-h2 color-highlight">{data.current.city}</h2>
              <p className="color-subdue">{data.current.condition}</p>
            </div>
            <WeatherIcon name={data.current.icon} className="ui-icon color-primary" />
          </div>

          <div className="flex items-end gap-7 margin-top-10">
            <span className="size-h1 color-highlight">{Math.round(data.current.temperature)}°</span>
            <span className="color-subdue size-h6">Umidità {data.current.humidity}%</span>
          </div>

          <ul className="list margin-top-15">
            {data.forecast.map((day) => (
              <li key={day.date} className="flex justify-between items-center">
                <span className="color-base">{day.weekday}</span>
                <WeatherIcon name={day.icon} className="ui-icon color-base" />
                <span className="color-highlight">
                  {Math.round(day.maxTemp)}° / {Math.round(day.minTemp)}°
                </span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    );
  },
});
