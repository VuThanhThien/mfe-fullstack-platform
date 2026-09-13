import { UserEntity } from '@/api/user/entities/user.entity';
import { SYSTEM_USER_ID } from '@/constants/app.constant';
import { setSeederFactory } from 'typeorm-extension';

export default setSeederFactory(UserEntity, (fake) => {
  const user = new UserEntity();

  const firstName = fake.person.firstName();
  const lastName = fake.person.lastName();
  user.username = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  // Lowercase: login lowercases the submitted email (EmailField transform), so a
  // mixed-case seeded address could never authenticate.
  user.email = fake.internet.email({ firstName, lastName }).toLowerCase();
  user.password = '12345678';
  user.bio = fake.lorem.sentence();
  user.image = fake.image.avatar();
  user.createdBy = SYSTEM_USER_ID;
  user.updatedBy = SYSTEM_USER_ID;

  return user;
});
