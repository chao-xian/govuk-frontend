import { body, validationResult } from 'express-validator'

import { formatValidationErrors } from '../../../utils.mjs'

/**
 * @param {import('express').Application} app
 */
export default (app) => {
  app.post(
    '/full-page-examples/update-your-account-details',
    [
      body('email')
        .exists()
        .isEmail().withMessage('Enter an email address in the correct format, like name@example.com')
        .not().isEmpty().withMessage('Enter your email address'),
      body('password')
        .exists()
        .not().isEmpty().withMessage('Enter your password')
    ],

    /**
     * @param {import('express').Request} request
     * @param {import('express').Response} response
     * @returns {void}
     */
    (request, response) => {
      const errors = formatValidationErrors(validationResult(request))

      if (!errors) {
        return response.render('./full-page-examples/update-your-account-details/confirm')
      }

      response.render('./full-page-examples/update-your-account-details/index', {
        errors,
        errorSummary: Object.values(errors),
        values: request.body // In production this should sanitized.
      })
    }
  )
}
