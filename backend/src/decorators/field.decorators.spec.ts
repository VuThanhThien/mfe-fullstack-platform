import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { URLField } from './field.decorators';

class LocalUrlDto {
  @URLField({ urlOptions: { require_tld: false, require_protocol: true } })
  url: string;
}

class PublicUrlDto {
  @URLField()
  url: string;
}

const constraintCodes = async (cls: new () => object, value: string) => {
  const errors = await validate(plainToInstance(cls, { url: value }));
  return errors.flatMap((error) => Object.keys(error.constraints ?? {}));
};

describe('URLField', () => {
  it('accepts a localhost URL when the TLD requirement is disabled', async () => {
    await expect(
      constraintCodes(LocalUrlDto, 'http://localhost:3001/remoteEntry.js'),
    ).resolves.toEqual([]);
  });

  it('accepts an internal hostname without a TLD', async () => {
    await expect(
      constraintCodes(LocalUrlDto, 'http://dashboard-remote/remoteEntry.js'),
    ).resolves.toEqual([]);
  });

  it('rejects a bare hostname with no protocol', async () => {
    await expect(constraintCodes(LocalUrlDto, 'not-a-url')).resolves.toContain(
      'isUrl',
    );
  });

  it('validates a single URL without array semantics', async () => {
    // Regression: URLField used to hardcode `IsUrl({}, { each: true })`, which
    // made every non-array URL fail with "each value ... must be a URL".
    await expect(
      constraintCodes(PublicUrlDto, 'https://cdn.example.com/remoteEntry.js'),
    ).resolves.toEqual([]);
  });

  it('still rejects a TLD-less URL by default', async () => {
    await expect(
      constraintCodes(PublicUrlDto, 'http://localhost:3001/remoteEntry.js'),
    ).resolves.toContain('isUrl');
  });
});
