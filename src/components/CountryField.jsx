import { countries } from '../data/countries';

export default function CountryField({ label = 'Country', name = 'country', value, onChange, error, required = false, placeholder = 'Search a country' }) {
  const listId = `${name}-countries`;
  const errorId = `${name}-error`;
  return (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <input
        name={name}
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      <datalist id={listId}>
        {countries.map(country => <option key={country} value={country} />)}
      </datalist>
      {error && <small id={errorId}>{error}</small>}
    </label>
  );
}
