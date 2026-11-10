// This will allow you to export all validators dynamically from the folder
import { RequiredValidator } from './RequiredValidator';
import { MinLengthValidator } from './MinLengthValidator';
import { MaxLengthValidator } from './MaxLengthValidator';
import { IsEmailValidator } from './IsEmailValidator';

export const Validators = {
    required: RequiredValidator,
    minLength: MinLengthValidator,
    maxLength: MaxLengthValidator,
    email: IsEmailValidator,
};
