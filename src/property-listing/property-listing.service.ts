import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { DB } from 'src/common/@types';
import { SearchPropertyListingType } from 'src/common/dto/searchPropertyListing.dto';

@Injectable()
export class PropertyListingService {
  constructor(@InjectKysely() private readonly db: DB) {}

  private searchPropertyListingQueryBuilder() {
    return this.db
      .selectFrom('properties')
      .innerJoin(
        'property_types',
        'property_types.property_type_id',
        'properties.property_type_id',
      )
      .innerJoin(
        'listing_types',
        'listing_types.listing_type_id',
        'properties.listing_type_id',
      )
      .innerJoin(
        'turnover_status',
        'turnover_status.turnover_status_id',
        'properties.turnover_status_id',
      )
      .innerJoin('cities', 'cities.city_id', 'properties.city_id')
      .select([
        'properties.property_id',
        'properties.listing_title',
        'properties.listing_url',
        'property_types.name as property_type_name',
        'listing_types.name as listing_type_name',
        'turnover_status.name as turnover_status_name',
        'properties.current_price',
        'properties.floor_area',
        'properties.lot_area',
        'properties.sqm',
        'properties.bedroom',
        'properties.bathroom',
        'properties.parking_lot',
        'properties.is_corner_lot',
        'properties.studio_type',
        'properties.building_name',
        'properties.year_built',
        'cities.name as city_name',
        'properties.address',
        'properties.is_active',
        'properties.is_cbd',
        'properties.amenities',
        'properties.images',
        'properties.description',
        'properties.longitude',
        'properties.latitude',
        'properties.lease_end',
        'properties.created_at',
      ]);
  }

  async searchPropertyListings(queryParams: SearchPropertyListingType) {
    let query = this.searchPropertyListingQueryBuilder();

    if (queryParams?.property_type) {
      query = query.where(
        'property_types.property_type_id',
        '=',
        queryParams.property_type,
      );
    }

    if (queryParams?.listing_type) {
      query = query.where(
        'listing_types.listing_type_id',
        '=',
        queryParams.listing_type,
      );
    }

    if (queryParams?.turnover_status) {
      query = query.where(
        'turnover_status.turnover_status_id',
        '=',
        queryParams.turnover_status,
      );
    }

    query = query.where('properties.images', 'is not', null);

    if (queryParams?.bedroom_count) {
      query = query.where('properties.bedroom', '=', queryParams.bedroom_count);
    }

    if (queryParams?.bathroom_count) {
      query = query.where(
        'properties.bathroom',
        '=',
        queryParams.bathroom_count,
      );
    }

    if (queryParams?.studio_type) {
      query = query.where(
        'properties.studio_type',
        '=',
        queryParams.studio_type,
      );
    }

    if (queryParams?.is_cbd) {
      query = query.where('properties.is_cbd', '=', queryParams.is_cbd);
    }

    if (queryParams?.city) {
      query = query.where('cities.city_id', '=', queryParams.city);
    }

    if (queryParams?.ilike) {
      query = query.where(
        'properties.listing_title',
        'ilike',
        '%' + queryParams.ilike + '%',
      );
    }

    if (queryParams?.sqm) {
      query = query.where('properties.sqm', '=', queryParams.sqm);
    }

    if (queryParams?.sqm_min && queryParams?.sqm_max) {
      const { sqm_min, sqm_max } = queryParams;

      query = query.where(
        sql`properties.sqm between ${sqm_min} and ${sqm_max}`,
      );
    }

    if (queryParams?.min_price && !queryParams?.max_price) {
      query = query.where(
        'properties.current_price',
        '>=',
        queryParams.min_price.toString(),
      );
    }

    if (!queryParams?.min_price && queryParams?.max_price) {
      query = query.where(
        'properties.current_price',
        '<=',
        queryParams.max_price.toString(),
      );
    }

    if (queryParams?.min_price && queryParams?.max_price) {
      const { min_price, max_price } = queryParams;

      query = query.where(
        sql`current_price between ${min_price} and ${max_price}`,
      );
    }

    query = query.where(
      sql`properties.current_price is distinct from 'NaN'::numeric`,
    );

    query = query.orderBy('properties.created_at', 'desc');

    return query.limit(queryParams?.page_limit || 100).execute();
  }

  async getOnePropertyListing(propertyId: string) {
    const query = this.searchPropertyListingQueryBuilder();

    return await query
      .where('properties.property_id', '=', propertyId)
      .executeTakeFirst();
  }

  async getPropertyTypes() {
    return await this.db
      .selectFrom('property_types')
      .select(['property_type_id', 'name'])
      .execute();
  }

  async getListingTypes() {
    return await this.db
      .selectFrom('listing_types')
      .select(['listing_type_id', 'name'])
      .execute();
  }

  async getTurnoverStatus() {
    return await this.db
      .selectFrom('turnover_status')
      .select(['turnover_status_id', 'name'])
      .execute();
  }

  async getCities(city: string) {
    let query = this.db.selectFrom('cities').select(['city_id', 'name']);

    if (city) {
      query = query.where('cities.name', 'ilike', '%' + city + '%');
    }

    query = query.where(
      sql`properties.current_price is distinct from 'NaN'::numeric`,
    );

    return await query.orderBy('cities.name', 'asc').limit(25).execute();
  }
}
